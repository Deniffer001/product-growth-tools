import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { mkdir, open, readFile, unlink, type FileHandle } from "node:fs/promises";

const DEFAULT_LOCK_TIMEOUT_MS = 10_000;
const LOCK_POLL_INTERVAL_MS = 10;

export type SpendOutcome = "confirmed_charged" | "confirmed_not_charged" | "unknown";

export type SpendAcknowledgement = Readonly<{
  allowSpend: true;
  invocationMaxCostMicros: number;
}>;

export type AuthorizedSpendEvent = Readonly<{
  type: "authorized";
  eventId: string;
  attemptId: string;
  ts: string;
  profile: string;
  provider: string;
  capability: string;
  manifestRevision: string;
  costPolicyRevision: string;
  inputSha256: string;
  maxCostMicros: number;
  acknowledgement: SpendAcknowledgement;
  currency: "USD";
}>;

export type SettlementSource = "automatic" | "manual";

export type SettledSpendEvent = Readonly<{
  type: "settled";
  eventId: string;
  attemptId: string;
  ts: string;
  outcome: SpendOutcome;
  costMicros: number | null;
  providerRequestId: string | null;
  policyBreach: boolean;
  settlementSource: SettlementSource;
  evidenceRef: string | null;
}>;

export type SpendLedgerEvent = AuthorizedSpendEvent | SettledSpendEvent;

export type AuthorizedSpendInput = Readonly<{
  attemptId: string;
  profile: string;
  provider: string;
  capability: string;
  manifestRevision: string;
  costPolicyRevision: string;
  inputSha256: string;
  maxCostMicros: number;
  acknowledgement: SpendAcknowledgement;
  currency?: "USD";
}>;

export type SettledSpendInput = Readonly<{
  attemptId: string;
  outcome: SpendOutcome;
  costMicros: number | null;
  providerRequestId?: string | null;
  settlementSource?: SettlementSource;
  evidenceRef?: string | null;
}>;

export type LedgerWriteOptions = Readonly<{
  ledgerPath: string;
  lockTimeoutMs?: number;
}>;

export type AuthorizeSpendOptions = LedgerWriteOptions &
  Readonly<{
    authorization: AuthorizedSpendInput;
  }>;

export type SettleSpendOptions = LedgerWriteOptions &
  Readonly<{
    settlement: SettledSpendInput;
  }>;

export type LedgerAttempt = Readonly<{
  authorization: AuthorizedSpendEvent;
  settlements: readonly SettledSpendEvent[];
  latestSettlement: SettledSpendEvent | null;
  effectiveOutcome: SpendOutcome;
}>;

export type LedgerSnapshot = Readonly<{
  path: string;
  events: readonly SpendLedgerEvent[];
  attempts: readonly LedgerAttempt[];
}>;

export type SpendBlockerReason = "policy_breach" | "unknown_outcome" | "unsettled_attempt";

export type SpendBlocker = Readonly<{
  reason: SpendBlockerReason;
  attemptId: string;
  profile: string;
  provider: string;
  capability: string;
  costPolicyRevision: string;
  inputSha256: string;
  settlementEventId: string | null;
}>;

export type SpendBlockerQuery = LedgerWriteOptions &
  Readonly<{
    profile: string;
    provider: string;
    capability?: string;
    costPolicyRevision?: string;
    inputSha256?: string;
  }>;

export type LedgerErrorCode =
  | "ATTEMPT_ALREADY_AUTHORIZED"
  | "ATTEMPT_ALREADY_SETTLED"
  | "ATTEMPT_NOT_AUTHORIZED"
  | "INVALID_LEDGER_EVENT"
  | "LEDGER_CORRUPT"
  | "LEDGER_IO_ERROR"
  | "LEDGER_LOCKED"
  | "SPEND_BLOCKED";

export class LedgerError extends Error {
  readonly code: LedgerErrorCode;
  readonly ledgerPath: string;

  constructor(code: LedgerErrorCode, message: string, ledgerPath: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "LedgerError";
    this.code = code;
    this.ledgerPath = ledgerPath;
  }
}

export class SpendBlockedError extends LedgerError {
  readonly blockers: readonly SpendBlocker[];

  constructor(ledgerPath: string, blockers: readonly SpendBlocker[]) {
    super(
      "SPEND_BLOCKED",
      "A prior spend attempt must be reconciled or its cost-policy revision must change before dispatch.",
      ledgerPath,
    );
    this.name = "SpendBlockedError";
    this.blockers = blockers;
  }
}

type LedgerLock = Readonly<{
  handle: FileHandle;
  path: string;
  token: string;
}>;

export function defaultLedgerPath(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const stateRoot = environment.XDG_STATE_HOME?.trim();
  if (stateRoot !== undefined && stateRoot.length > 0) {
    if (!isAbsolute(stateRoot)) {
      throw new LedgerError(
        "INVALID_LEDGER_EVENT",
        "XDG_STATE_HOME must be an absolute path when set.",
        resolve(stateRoot, "gkit", "ledger.jsonl"),
      );
    }
    return resolve(stateRoot, "gkit", "ledger.jsonl");
  }
  const configuredHome = environment.HOME?.trim();
  const home = configuredHome || homedir();
  if (!isAbsolute(home)) {
    throw new LedgerError(
      "INVALID_LEDGER_EVENT",
      "HOME must be an absolute path when used for the spend ledger.",
      resolve(home, ".local", "state", "gkit", "ledger.jsonl"),
    );
  }
  return join(home, ".local", "state", "gkit", "ledger.jsonl");
}

export async function readLedger(options: LedgerWriteOptions): Promise<LedgerSnapshot> {
  const ledgerPath = resolveLedgerPath(options.ledgerPath);
  const lockTimeoutMs = options.lockTimeoutMs ?? DEFAULT_LOCK_TIMEOUT_MS;
  validateLockTimeout(lockTimeoutMs, ledgerPath);

  return await withLedgerLock(ledgerPath, lockTimeoutMs, async () => {
    return await readLedgerUnlocked(ledgerPath);
  });
}

export async function getSpendBlockers(
  options: SpendBlockerQuery,
): Promise<readonly SpendBlocker[]> {
  validateNonEmpty(options.profile, "profile", options.ledgerPath);
  validateNonEmpty(options.provider, "provider", options.ledgerPath);
  if (options.capability !== undefined) {
    validateNonEmpty(options.capability, "capability", options.ledgerPath);
  }
  if (options.costPolicyRevision !== undefined) {
    validateNonEmpty(options.costPolicyRevision, "costPolicyRevision", options.ledgerPath);
  }
  if (options.inputSha256 !== undefined && !/^[0-9a-f]{64}$/.test(options.inputSha256)) {
    throw new LedgerError(
      "INVALID_LEDGER_EVENT",
      "inputSha256 must be a lowercase SHA-256 digest.",
      resolveLedgerPath(options.ledgerPath),
    );
  }

  const snapshot = await readLedger(options);
  return findSpendBlockers(snapshot, options);
}

export async function assertSpendAllowed(options: SpendBlockerQuery): Promise<void> {
  const blockers = await getSpendBlockers(options);
  if (blockers.length > 0) {
    throw new SpendBlockedError(resolveLedgerPath(options.ledgerPath), blockers);
  }
}

export async function authorizeIfUnblocked(
  options: AuthorizeSpendOptions,
): Promise<AuthorizedSpendEvent> {
  const ledgerPath = resolveLedgerPath(options.ledgerPath);
  const lockTimeoutMs = options.lockTimeoutMs ?? DEFAULT_LOCK_TIMEOUT_MS;
  validateLockTimeout(lockTimeoutMs, ledgerPath);
  validateAuthorizedInput(options.authorization, ledgerPath);

  return await withLedgerLock(ledgerPath, lockTimeoutMs, async () => {
    const snapshot = await readLedgerUnlocked(ledgerPath);
    const existingAttempt = snapshot.attempts.find(
      (attempt) => attempt.authorization.attemptId === options.authorization.attemptId,
    );
    if (existingAttempt !== undefined) {
      throw new LedgerError(
        "ATTEMPT_ALREADY_AUTHORIZED",
        "The spend attempt has already been authorized.",
        ledgerPath,
      );
    }

    const query: SpendBlockerQuery = {
      ledgerPath,
      profile: options.authorization.profile,
      provider: options.authorization.provider,
      capability: options.authorization.capability,
      costPolicyRevision: options.authorization.costPolicyRevision,
      inputSha256: options.authorization.inputSha256,
    };
    const blockers = findSpendBlockers(snapshot, query);
    if (blockers.length > 0) {
      throw new SpendBlockedError(ledgerPath, blockers);
    }

    const event: AuthorizedSpendEvent = {
      type: "authorized",
      eventId: randomUUID(),
      attemptId: options.authorization.attemptId,
      ts: new Date().toISOString(),
      profile: options.authorization.profile,
      provider: options.authorization.provider,
      capability: options.authorization.capability,
      manifestRevision: options.authorization.manifestRevision,
      costPolicyRevision: options.authorization.costPolicyRevision,
      inputSha256: options.authorization.inputSha256,
      maxCostMicros: options.authorization.maxCostMicros,
      acknowledgement: {
        allowSpend: true,
        invocationMaxCostMicros: options.authorization.acknowledgement.invocationMaxCostMicros,
      },
      currency: options.authorization.currency ?? "USD",
    };

    await appendEventUnlocked(ledgerPath, event);
    return event;
  });
}

export async function appendAuthorized(
  options: AuthorizeSpendOptions,
): Promise<AuthorizedSpendEvent> {
  return await authorizeIfUnblocked(options);
}

export async function appendSettled(options: SettleSpendOptions): Promise<SettledSpendEvent> {
  const ledgerPath = resolveLedgerPath(options.ledgerPath);
  const lockTimeoutMs = options.lockTimeoutMs ?? DEFAULT_LOCK_TIMEOUT_MS;
  validateLockTimeout(lockTimeoutMs, ledgerPath);
  validateSettlementInput(options.settlement, ledgerPath);

  return await withLedgerLock(ledgerPath, lockTimeoutMs, async () => {
    const snapshot = await readLedgerUnlocked(ledgerPath);
    const attempt = snapshot.attempts.find(
      (candidate) => candidate.authorization.attemptId === options.settlement.attemptId,
    );

    if (attempt === undefined) {
      throw new LedgerError(
        "ATTEMPT_NOT_AUTHORIZED",
        "The spend attempt must have a durable authorization before settlement.",
        ledgerPath,
      );
    }

    if (attempt.latestSettlement !== null && attempt.latestSettlement.outcome !== "unknown") {
      throw new LedgerError(
        "ATTEMPT_ALREADY_SETTLED",
        "The spend attempt already has a confirmed settlement.",
        ledgerPath,
      );
    }

    if (
      attempt.latestSettlement?.outcome === "unknown" &&
      options.settlement.outcome === "unknown"
    ) {
      throw new LedgerError(
        "ATTEMPT_ALREADY_SETTLED",
        "The spend attempt already has an unknown settlement and requires reconciliation.",
        ledgerPath,
      );
    }

    const settlementSource = options.settlement.settlementSource ?? "automatic";
    if (attempt.latestSettlement?.outcome === "unknown" && settlementSource !== "manual") {
      throw new LedgerError(
        "INVALID_LEDGER_EVENT",
        "An unknown spend outcome requires explicit evidence-backed manual reconciliation.",
        ledgerPath,
      );
    }
    const event: SettledSpendEvent = {
      type: "settled",
      eventId: randomUUID(),
      attemptId: options.settlement.attemptId,
      ts: new Date().toISOString(),
      outcome: options.settlement.outcome,
      costMicros: options.settlement.costMicros,
      providerRequestId: options.settlement.providerRequestId ?? null,
      policyBreach:
        options.settlement.costMicros !== null &&
        options.settlement.costMicros > attempt.authorization.maxCostMicros,
      settlementSource,
      evidenceRef: options.settlement.evidenceRef ?? null,
    };

    await appendEventUnlocked(ledgerPath, event);
    return event;
  });
}

export function findSpendBlockers(
  snapshot: LedgerSnapshot,
  query: Omit<SpendBlockerQuery, "ledgerPath" | "lockTimeoutMs">,
): readonly SpendBlocker[] {
  const blockers: SpendBlocker[] = [];

  for (const attempt of snapshot.attempts) {
    const authorization = attempt.authorization;
    if (authorization.profile !== query.profile || authorization.provider !== query.provider) {
      continue;
    }

    const capabilityMatches =
      query.capability === undefined || authorization.capability === query.capability;
    const inputMatches =
      query.inputSha256 === undefined || authorization.inputSha256 === query.inputSha256;
    const policyRevisionMatches =
      query.costPolicyRevision === undefined ||
      authorization.costPolicyRevision === query.costPolicyRevision;

    if (capabilityMatches && inputMatches) {
      if (attempt.latestSettlement === null) {
        blockers.push(createBlocker("unsettled_attempt", attempt, null));
      } else if (attempt.latestSettlement.outcome === "unknown") {
        blockers.push(createBlocker("unknown_outcome", attempt, attempt.latestSettlement.eventId));
      }
    }

    if (capabilityMatches && policyRevisionMatches) {
      const breach = attempt.settlements.find((settlement) => settlement.policyBreach);
      if (breach !== undefined) {
        blockers.push(createBlocker("policy_breach", attempt, breach.eventId));
      }
    }
  }

  return blockers.sort(compareBlockers);
}

function createBlocker(
  reason: SpendBlockerReason,
  attempt: LedgerAttempt,
  settlementEventId: string | null,
): SpendBlocker {
  return {
    reason,
    attemptId: attempt.authorization.attemptId,
    profile: attempt.authorization.profile,
    provider: attempt.authorization.provider,
    capability: attempt.authorization.capability,
    costPolicyRevision: attempt.authorization.costPolicyRevision,
    inputSha256: attempt.authorization.inputSha256,
    settlementEventId,
  };
}

function compareBlockers(left: SpendBlocker, right: SpendBlocker): number {
  const attemptComparison = left.attemptId.localeCompare(right.attemptId);
  if (attemptComparison !== 0) {
    return attemptComparison;
  }
  return left.reason.localeCompare(right.reason);
}

async function readLedgerUnlocked(ledgerPath: string): Promise<LedgerSnapshot> {
  let contents: string;

  try {
    contents = await readFile(ledgerPath, "utf8");
  } catch (error) {
    if (errorCode(error) === "ENOENT") {
      return { path: ledgerPath, events: [], attempts: [] };
    }
    throw new LedgerError("LEDGER_IO_ERROR", "Failed to read the spend ledger.", ledgerPath, error);
  }

  if (contents.length === 0) {
    return { path: ledgerPath, events: [], attempts: [] };
  }

  if (!contents.endsWith("\n")) {
    throw new LedgerError(
      "LEDGER_CORRUPT",
      "The spend ledger ends with an incomplete JSON line.",
      ledgerPath,
    );
  }

  const events: SpendLedgerEvent[] = [];
  const eventIds = new Map<string, string>();
  const lines = contents.slice(0, -1).split("\n");

  for (const [index, line] of lines.entries()) {
    if (line.length === 0) {
      throw new LedgerError(
        "LEDGER_CORRUPT",
        `The spend ledger contains an empty line at ${index + 1}.`,
        ledgerPath,
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(line) as unknown;
    } catch (error) {
      throw new LedgerError(
        "LEDGER_CORRUPT",
        `The spend ledger contains invalid JSON at line ${index + 1}.`,
        ledgerPath,
        error,
      );
    }

    const event = parseLedgerEvent(parsed, ledgerPath, index + 1);
    const canonical = canonicalJson(event);
    const priorCanonical = eventIds.get(event.eventId);
    if (priorCanonical !== undefined) {
      if (priorCanonical !== canonical) {
        throw new LedgerError(
          "LEDGER_CORRUPT",
          `The spend ledger reuses eventId ${event.eventId} with different data.`,
          ledgerPath,
        );
      }
      continue;
    }

    eventIds.set(event.eventId, canonical);
    events.push(event);
  }

  const attempts = foldAttempts(events, ledgerPath);
  return { path: ledgerPath, events, attempts };
}

function foldAttempts(
  events: readonly SpendLedgerEvent[],
  ledgerPath: string,
): readonly LedgerAttempt[] {
  const attempts = new Map<
    string,
    { authorization: AuthorizedSpendEvent; settlements: SettledSpendEvent[] }
  >();

  for (const event of events) {
    if (event.type === "authorized") {
      if (attempts.has(event.attemptId)) {
        throw new LedgerError(
          "LEDGER_CORRUPT",
          `The spend ledger authorizes attempt ${event.attemptId} more than once.`,
          ledgerPath,
        );
      }
      attempts.set(event.attemptId, { authorization: event, settlements: [] });
      continue;
    }

    const attempt = attempts.get(event.attemptId);
    if (attempt === undefined) {
      throw new LedgerError(
        "LEDGER_CORRUPT",
        `The spend ledger settles unknown attempt ${event.attemptId}.`,
        ledgerPath,
      );
    }

    const expectedPolicyBreach =
      event.costMicros !== null && event.costMicros > attempt.authorization.maxCostMicros;
    if (event.policyBreach !== expectedPolicyBreach) {
      throw new LedgerError(
        "LEDGER_CORRUPT",
        `The spend ledger has an invalid policy-breach marker for attempt ${event.attemptId}.`,
        ledgerPath,
      );
    }

    const latestSettlement = attempt.settlements.at(-1);
    if (latestSettlement !== undefined && latestSettlement.outcome !== "unknown") {
      throw new LedgerError(
        "LEDGER_CORRUPT",
        `The spend ledger changes confirmed attempt ${event.attemptId}.`,
        ledgerPath,
      );
    }
    if (latestSettlement?.outcome === "unknown" && event.outcome === "unknown") {
      throw new LedgerError(
        "LEDGER_CORRUPT",
        `The spend ledger records repeated unknown settlements for attempt ${event.attemptId}.`,
        ledgerPath,
      );
    }
    attempt.settlements.push(event);
  }

  return [...attempts.values()].map((attempt) => {
    const latestSettlement = attempt.settlements.at(-1) ?? null;
    return {
      authorization: attempt.authorization,
      settlements: attempt.settlements,
      latestSettlement,
      effectiveOutcome: latestSettlement?.outcome ?? "unknown",
    };
  });
}

async function appendEventUnlocked(ledgerPath: string, event: SpendLedgerEvent): Promise<void> {
  await mkdir(dirname(ledgerPath), { recursive: true, mode: 0o700 });
  const line = Buffer.from(`${canonicalJson(event)}\n`, "utf8");
  let handle: FileHandle | null = null;

  try {
    handle = await open(ledgerPath, "a", 0o600);
    await handle.chmod(0o600);
    const originalSize = (await handle.stat()).size;
    const writeResult = await handle.write(line, 0, line.byteLength, null);
    if (writeResult.bytesWritten !== line.byteLength) {
      await handle.truncate(originalSize);
      await handle.sync();
      throw new Error("The ledger append was incomplete.");
    }
    await handle.sync();
    await handle.close();
    handle = null;
    await syncDirectory(dirname(ledgerPath));
  } catch (error) {
    throw new LedgerError(
      "LEDGER_IO_ERROR",
      "Failed to durably append the spend ledger event.",
      ledgerPath,
      error,
    );
  } finally {
    if (handle !== null) {
      await handle.close().catch(() => undefined);
    }
  }
}

async function syncDirectory(directoryPath: string): Promise<void> {
  const directory = await open(directoryPath, "r");
  try {
    await directory.sync();
  } finally {
    await directory.close();
  }
}

async function withLedgerLock<T>(
  ledgerPath: string,
  lockTimeoutMs: number,
  callback: () => Promise<T>,
): Promise<T> {
  const lock = await acquireLedgerLock(ledgerPath, lockTimeoutMs);

  try {
    return await callback();
  } finally {
    await releaseLedgerLock(lock, ledgerPath);
  }
}

async function acquireLedgerLock(ledgerPath: string, lockTimeoutMs: number): Promise<LedgerLock> {
  await mkdir(dirname(ledgerPath), { recursive: true, mode: 0o700 });
  const lockPath = `${ledgerPath}.lock`;
  const deadline = Date.now() + lockTimeoutMs;

  while (true) {
    try {
      const handle = await open(lockPath, "wx", 0o600);
      const token = randomUUID();
      try {
        await handle.chmod(0o600);
        await handle.writeFile(
          `${JSON.stringify({ pid: process.pid, token, createdAt: new Date().toISOString() })}\n`,
          "utf8",
        );
        await handle.sync();
      } catch (error) {
        await handle.close().catch(() => undefined);
        await unlink(lockPath).catch(() => undefined);
        throw error;
      }
      return { handle, path: lockPath, token };
    } catch (error) {
      if (errorCode(error) !== "EEXIST") {
        throw new LedgerError(
          "LEDGER_IO_ERROR",
          "Failed to acquire the spend ledger lock.",
          ledgerPath,
          error,
        );
      }

      if (Date.now() >= deadline) {
        throw new LedgerError(
          "LEDGER_LOCKED",
          "The spend ledger is locked by another process. Review the lock before retrying.",
          ledgerPath,
        );
      }

      await delay(LOCK_POLL_INTERVAL_MS);
    }
  }
}

async function releaseLedgerLock(lock: LedgerLock, ledgerPath: string): Promise<void> {
  let releaseError: unknown;

  try {
    const lockText = await readFile(lock.path, "utf8");
    const record = JSON.parse(lockText) as unknown;
    if (!isRecord(record) || record.token !== lock.token) {
      throw new Error("Spend ledger lock ownership changed unexpectedly.");
    }
  } catch (error) {
    releaseError = error;
  }

  try {
    await lock.handle.close();
  } catch (error) {
    releaseError = error;
  }

  if (releaseError === undefined) {
    try {
      await unlink(lock.path);
    } catch (error) {
      releaseError = error;
    }
  }

  if (releaseError !== undefined) {
    throw new LedgerError(
      "LEDGER_IO_ERROR",
      "Failed to release the spend ledger lock.",
      ledgerPath,
      releaseError,
    );
  }
}

function parseLedgerEvent(
  value: unknown,
  ledgerPath: string,
  lineNumber: number,
): SpendLedgerEvent {
  if (!isRecord(value) || (value.type !== "authorized" && value.type !== "settled")) {
    throw invalidLedgerLine(ledgerPath, lineNumber);
  }

  if (value.type === "authorized") {
    if (
      !hasExactKeys(value, AUTHORIZED_EVENT_KEYS) ||
      !isSpendAcknowledgement(value.acknowledgement)
    ) {
      throw invalidLedgerLine(ledgerPath, lineNumber);
    }

    const event: AuthorizedSpendEvent = {
      type: "authorized",
      eventId: requiredString(value.eventId, ledgerPath, lineNumber),
      attemptId: requiredString(value.attemptId, ledgerPath, lineNumber),
      ts: requiredTimestamp(value.ts, ledgerPath, lineNumber),
      profile: requiredString(value.profile, ledgerPath, lineNumber),
      provider: requiredString(value.provider, ledgerPath, lineNumber),
      capability: requiredString(value.capability, ledgerPath, lineNumber),
      manifestRevision: requiredString(value.manifestRevision, ledgerPath, lineNumber),
      costPolicyRevision: requiredString(value.costPolicyRevision, ledgerPath, lineNumber),
      inputSha256: requiredSha256(value.inputSha256, ledgerPath, lineNumber),
      maxCostMicros: requiredMicros(value.maxCostMicros, ledgerPath, lineNumber),
      acknowledgement: {
        allowSpend: true,
        invocationMaxCostMicros: requiredMicros(
          value.acknowledgement.invocationMaxCostMicros,
          ledgerPath,
          lineNumber,
        ),
      },
      currency: requiredUsd(value.currency, ledgerPath, lineNumber),
    };
    if (event.maxCostMicros > event.acknowledgement.invocationMaxCostMicros) {
      throw invalidLedgerLine(ledgerPath, lineNumber);
    }
    return event;
  }

  if (!hasExactKeys(value, SETTLED_EVENT_KEYS)) {
    throw invalidLedgerLine(ledgerPath, lineNumber);
  }

  const outcome = requiredOutcome(value.outcome, ledgerPath, lineNumber);
  const costMicros = nullableMicros(value.costMicros, ledgerPath, lineNumber);
  const settlementSource = requiredSettlementSource(value.settlementSource, ledgerPath, lineNumber);
  const evidenceRef = nullableString(value.evidenceRef, ledgerPath, lineNumber);
  validateOutcomeCost(outcome, costMicros, ledgerPath);
  validateManualEvidence(settlementSource, evidenceRef, ledgerPath);

  return {
    type: "settled",
    eventId: requiredString(value.eventId, ledgerPath, lineNumber),
    attemptId: requiredString(value.attemptId, ledgerPath, lineNumber),
    ts: requiredTimestamp(value.ts, ledgerPath, lineNumber),
    outcome,
    costMicros,
    providerRequestId: nullableString(value.providerRequestId, ledgerPath, lineNumber),
    policyBreach: requiredBoolean(value.policyBreach, ledgerPath, lineNumber),
    settlementSource,
    evidenceRef,
  };
}

const AUTHORIZED_EVENT_KEYS = [
  "acknowledgement",
  "attemptId",
  "capability",
  "costPolicyRevision",
  "currency",
  "eventId",
  "inputSha256",
  "manifestRevision",
  "maxCostMicros",
  "profile",
  "provider",
  "ts",
  "type",
] as const;

const SETTLED_EVENT_KEYS = [
  "attemptId",
  "costMicros",
  "evidenceRef",
  "eventId",
  "outcome",
  "policyBreach",
  "providerRequestId",
  "settlementSource",
  "ts",
  "type",
] as const;

function validateAuthorizedInput(input: AuthorizedSpendInput, ledgerPath: string): void {
  validateNonEmpty(input.attemptId, "attemptId", ledgerPath);
  validateNonEmpty(input.profile, "profile", ledgerPath);
  validateNonEmpty(input.provider, "provider", ledgerPath);
  validateNonEmpty(input.capability, "capability", ledgerPath);
  validateNonEmpty(input.manifestRevision, "manifestRevision", ledgerPath);
  validateNonEmpty(input.costPolicyRevision, "costPolicyRevision", ledgerPath);
  if (!/^[0-9a-f]{64}$/.test(input.inputSha256)) {
    throw new LedgerError(
      "INVALID_LEDGER_EVENT",
      "inputSha256 must be a lowercase SHA-256 digest.",
      ledgerPath,
    );
  }
  validateMicros(input.maxCostMicros, "maxCostMicros", ledgerPath);
  if (input.acknowledgement.allowSpend !== true) {
    throw new LedgerError(
      "INVALID_LEDGER_EVENT",
      "The durable authorization requires an explicit spend acknowledgement.",
      ledgerPath,
    );
  }
  validateMicros(
    input.acknowledgement.invocationMaxCostMicros,
    "invocationMaxCostMicros",
    ledgerPath,
  );
  if (input.maxCostMicros > input.acknowledgement.invocationMaxCostMicros) {
    throw new LedgerError(
      "INVALID_LEDGER_EVENT",
      "The reviewed cost bound exceeds the invocation spend cap.",
      ledgerPath,
    );
  }
  if ((input.currency ?? "USD") !== "USD") {
    throw new LedgerError(
      "INVALID_LEDGER_EVENT",
      "Only USD spend events are supported.",
      ledgerPath,
    );
  }
}

function validateSettlementInput(input: SettledSpendInput, ledgerPath: string): void {
  validateNonEmpty(input.attemptId, "attemptId", ledgerPath);
  if (
    input.outcome !== "confirmed_charged" &&
    input.outcome !== "confirmed_not_charged" &&
    input.outcome !== "unknown"
  ) {
    throw new LedgerError("INVALID_LEDGER_EVENT", "The settlement outcome is invalid.", ledgerPath);
  }
  if (input.providerRequestId !== undefined && input.providerRequestId !== null) {
    validateNonEmpty(input.providerRequestId, "providerRequestId", ledgerPath);
  }
  if (input.evidenceRef !== undefined && input.evidenceRef !== null) {
    validateNonEmpty(input.evidenceRef, "evidenceRef", ledgerPath);
  }
  if (input.costMicros !== null) {
    validateMicros(input.costMicros, "costMicros", ledgerPath);
  }
  const source = input.settlementSource ?? "automatic";
  if (source !== "automatic" && source !== "manual") {
    throw new LedgerError("INVALID_LEDGER_EVENT", "The settlement source is invalid.", ledgerPath);
  }
  validateOutcomeCost(input.outcome, input.costMicros, ledgerPath);
  validateManualEvidence(source, input.evidenceRef ?? null, ledgerPath);
}

function validateOutcomeCost(
  outcome: SpendOutcome,
  costMicros: number | null,
  ledgerPath: string,
): void {
  if (
    outcome === "confirmed_charged" &&
    (costMicros === null || costMicros <= 0)
  ) {
    throw new LedgerError(
      "INVALID_LEDGER_EVENT",
      "A confirmed charged settlement requires a positive evidenced cost.",
      ledgerPath,
    );
  }
  if (outcome === "confirmed_not_charged" && costMicros !== 0) {
    throw new LedgerError(
      "INVALID_LEDGER_EVENT",
      "A confirmed not-charged settlement must record zero cost.",
      ledgerPath,
    );
  }
}

function validateManualEvidence(
  source: SettlementSource,
  evidenceRef: string | null,
  ledgerPath: string,
): void {
  if (source === "manual" && evidenceRef === null) {
    throw new LedgerError(
      "INVALID_LEDGER_EVENT",
      "A manual reconciliation requires a non-secret evidence reference.",
      ledgerPath,
    );
  }
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalValue(value));
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalValue);
  }
  if (!isRecord(value)) {
    return value;
  }

  const canonical: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    const child = value[key];
    if (child !== undefined) {
      canonical[key] = canonicalValue(child);
    }
  }
  return canonical;
}

function hasExactKeys(value: Record<string, unknown>, expectedKeys: readonly string[]): boolean {
  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  return (
    actualKeys.length === sortedExpectedKeys.length &&
    actualKeys.every((key, index) => key === sortedExpectedKeys[index])
  );
}

function isSpendAcknowledgement(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["allowSpend", "invocationMaxCostMicros"]) &&
    value.allowSpend === true
  );
}

function requiredString(value: unknown, ledgerPath: string, lineNumber: number): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw invalidLedgerLine(ledgerPath, lineNumber);
  }
  return value;
}

function nullableString(value: unknown, ledgerPath: string, lineNumber: number): string | null {
  if (value === null) {
    return null;
  }
  return requiredString(value, ledgerPath, lineNumber);
}

function requiredTimestamp(value: unknown, ledgerPath: string, lineNumber: number): string {
  const timestamp = requiredString(value, ledgerPath, lineNumber);
  if (Number.isNaN(Date.parse(timestamp))) {
    throw invalidLedgerLine(ledgerPath, lineNumber);
  }
  return timestamp;
}

function requiredSha256(value: unknown, ledgerPath: string, lineNumber: number): string {
  const digest = requiredString(value, ledgerPath, lineNumber);
  if (!/^[0-9a-f]{64}$/.test(digest)) {
    throw invalidLedgerLine(ledgerPath, lineNumber);
  }
  return digest;
}

function requiredMicros(value: unknown, ledgerPath: string, lineNumber: number): number {
  if (!Number.isSafeInteger(value) || typeof value !== "number" || value < 0) {
    throw invalidLedgerLine(ledgerPath, lineNumber);
  }
  return value;
}

function nullableMicros(value: unknown, ledgerPath: string, lineNumber: number): number | null {
  if (value === null) {
    return null;
  }
  return requiredMicros(value, ledgerPath, lineNumber);
}

function requiredUsd(value: unknown, ledgerPath: string, lineNumber: number): "USD" {
  if (value !== "USD") {
    throw invalidLedgerLine(ledgerPath, lineNumber);
  }
  return value;
}

function requiredOutcome(value: unknown, ledgerPath: string, lineNumber: number): SpendOutcome {
  if (value !== "confirmed_charged" && value !== "confirmed_not_charged" && value !== "unknown") {
    throw invalidLedgerLine(ledgerPath, lineNumber);
  }
  return value;
}

function requiredSettlementSource(
  value: unknown,
  ledgerPath: string,
  lineNumber: number,
): SettlementSource {
  if (value !== "automatic" && value !== "manual") {
    throw invalidLedgerLine(ledgerPath, lineNumber);
  }
  return value;
}

function requiredBoolean(value: unknown, ledgerPath: string, lineNumber: number): boolean {
  if (typeof value !== "boolean") {
    throw invalidLedgerLine(ledgerPath, lineNumber);
  }
  return value;
}

function invalidLedgerLine(ledgerPath: string, lineNumber: number): LedgerError {
  return new LedgerError(
    "LEDGER_CORRUPT",
    `The spend ledger event at line ${lineNumber} is invalid.`,
    ledgerPath,
  );
}

function validateNonEmpty(value: string, fieldName: string, ledgerPath: string): void {
  if (value.trim().length === 0) {
    throw new LedgerError(
      "INVALID_LEDGER_EVENT",
      `${fieldName} must not be empty.`,
      resolveLedgerPath(ledgerPath),
    );
  }
}

function validateMicros(value: number, fieldName: string, ledgerPath: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new LedgerError(
      "INVALID_LEDGER_EVENT",
      `${fieldName} must be a non-negative safe integer in micros.`,
      ledgerPath,
    );
  }
}

function validateLockTimeout(lockTimeoutMs: number, ledgerPath: string): void {
  if (!Number.isSafeInteger(lockTimeoutMs) || lockTimeoutMs < 0) {
    throw new LedgerError(
      "INVALID_LEDGER_EVENT",
      "The ledger lock timeout must be a non-negative integer.",
      ledgerPath,
    );
  }
}

function resolveLedgerPath(ledgerPath: string): string {
  if (ledgerPath.trim().length === 0) {
    throw new LedgerError("INVALID_LEDGER_EVENT", "The ledger path must not be empty.", ledgerPath);
  }
  return resolve(ledgerPath);
}

function errorCode(error: unknown): string | undefined {
  if (!isRecord(error)) {
    return undefined;
  }
  return typeof error.code === "string" ? error.code : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function delay(milliseconds: number): Promise<void> {
  await new Promise<void>((resolveDelay) => {
    setTimeout(resolveDelay, milliseconds);
  });
}
