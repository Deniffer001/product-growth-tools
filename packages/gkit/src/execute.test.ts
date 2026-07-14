import { afterEach, describe, expect, it, vi } from "vitest";
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { ParsedCommand } from "./args";
import { reserveArtifactDestination } from "./artifact";
import { executeDataForSeoCall } from "./execute";
import {
  authorizeIfUnblocked,
  LedgerError,
  readLedger,
} from "./ledger";
import { compileExecutableManifest, loadExecutableManifest } from "./manifest";
import { resolveProviderSecrets } from "./profile";
import type { DataForSeoDispatchResult } from "./providers/dataforseo";

const temporaryDirectories: string[] = [];
const manifestPath = new URL(
  "../generated/dataforseo/manifest.json",
  import.meta.url,
).pathname;
const providerTaskId = "10131644-1535-0347-0000-750206cf57d8";
const createdTaskId = "10131644-1535-0347-0000-750206cf57d9";
const credentialShapedTaskId = "10131644-1535-0347-0000-750206cf57da";

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(async (directory) => {
      await rm(directory, { recursive: true, force: true });
    }),
  );
});

describe("DataForSEO execution pipeline", () => {
  it("blocks effect before secret resolution, adapter load, authorization, or transport", async () => {
    const fixture = await createFixture();
    const resolveSecrets = vi.fn(resolveProviderSecrets);
    const loadAdapter = vi.fn(async () => adapter(successResult(24_072)));
    const authorize = vi.fn();

    const result = await executeDataForSeoCall({
      command: callCommand(fixture, { allowSpend: false }),
      manifest: fixture.manifest,
      signal: new AbortController().signal,
      xdgConfigHome: fixture.configHome,
      ledgerPath: fixture.ledgerPath,
      env: {},
      dependencies: {
        resolveProviderSecrets: resolveSecrets,
        loadDataForSeoAdapter: loadAdapter,
        authorizeIfUnblocked: authorize as never,
      },
    });

    expect(result.envelope).toMatchObject({
      ok: false,
      error: { code: "EFFECT_NOT_ALLOWED", outcome: "not_dispatched" },
      meta: {
        attemptId: null,
        spendOutcome: null,
        providerRequestId: null,
      },
    });
    expect(resolveSecrets).not.toHaveBeenCalled();
    expect(authorize).not.toHaveBeenCalled();
    expect(loadAdapter).not.toHaveBeenCalled();
    expect(result.exitCode).toBe(1);
  });

  it("prefers --profile and dry-runs after the gate without secrets, ledger writes, artifact locks, or adapters", async () => {
    const fixture = await createFixture();
    const resolveSecrets = vi.fn(resolveProviderSecrets);
    const loadAdapter = vi.fn(async () => adapter(successResult(24_072)));
    const authorize = vi.fn();
    const reserve = vi.fn();

    const result = await executeDataForSeoCall({
      command: callCommand(fixture, { dryRun: true }),
      manifest: fixture.manifest,
      signal: new AbortController().signal,
      xdgConfigHome: fixture.configHome,
      ledgerPath: fixture.ledgerPath,
      env: { GKIT_PROFILE: "other-app" },
      dependencies: {
        resolveProviderSecrets: resolveSecrets,
        loadDataForSeoAdapter: loadAdapter,
        authorizeIfUnblocked: authorize as never,
        reserveArtifactDestination: reserve as never,
      },
    });

    expect(result.envelope).toMatchObject({
      ok: true,
      data: {
        dryRun: true,
        requestPlan: { environment: "production", targetCount: 2 },
        costUpperBound: { amount: "0.024072" },
      },
      meta: { profile: "app-a" },
    });
    expect(resolveSecrets).not.toHaveBeenCalled();
    expect(authorize).not.toHaveBeenCalled();
    expect(reserve).not.toHaveBeenCalled();
    expect(loadAdapter).not.toHaveBeenCalled();
  });

  it("returns CANCELLED/130 for an already-aborted dry-run without touching local or provider effects", async () => {
    const fixture = await createFixture();
    const controller = new AbortController();
    controller.abort(new Error("SIGINT"));
    const reserve = vi.fn();
    const authorize = vi.fn();
    const loadAdapter = vi.fn();

    const result = await executeDataForSeoCall({
      command: callCommand(fixture, { dryRun: true }),
      manifest: fixture.manifest,
      signal: controller.signal,
      xdgConfigHome: fixture.configHome,
      ledgerPath: fixture.ledgerPath,
      env: secretEnvironment(),
      dependencies: {
        reserveArtifactDestination: reserve as never,
        authorizeIfUnblocked: authorize as never,
        loadDataForSeoAdapter: loadAdapter as never,
      },
    });

    expect(result.envelope).toMatchObject({
      ok: false,
      error: { code: "CANCELLED", outcome: "not_dispatched" },
      meta: { attemptId: null, spendOutcome: null },
    });
    expect(result.exitCode).toBe(130);
    expect(reserve).not.toHaveBeenCalled();
    expect(authorize).not.toHaveBeenCalled();
    expect(loadAdapter).not.toHaveBeenCalled();
  });

  it("normalizes a signal arriving during pre-dispatch local I/O to CANCELLED/130", async () => {
    const fixture = await createFixture();
    const controller = new AbortController();
    const authorize = vi.fn();
    const loadAdapter = vi.fn();

    const result = await executeDataForSeoCall({
      command: callCommand(fixture),
      manifest: fixture.manifest,
      signal: controller.signal,
      xdgConfigHome: fixture.configHome,
      ledgerPath: fixture.ledgerPath,
      env: secretEnvironment(),
      dependencies: {
        getSpendBlockers: async () => {
          controller.abort(new Error("SIGINT"));
          throw new Error("simulated interrupted lock wait");
        },
        authorizeIfUnblocked: authorize as never,
        loadDataForSeoAdapter: loadAdapter as never,
      },
    });

    expect(result.envelope).toMatchObject({
      ok: false,
      error: { code: "CANCELLED", outcome: "not_dispatched" },
      meta: { attemptId: null, spendOutcome: null },
    });
    expect(result.exitCode).toBe(130);
    expect(authorize).not.toHaveBeenCalled();
    expect(loadAdapter).not.toHaveBeenCalled();
  });

  it("fails missing secrets before adapter load or transport", async () => {
    const fixture = await createFixture();
    const loadAdapter = vi.fn(async () => adapter(successResult(24_072)));

    const result = await executeDataForSeoCall({
      command: callCommand(fixture),
      manifest: fixture.manifest,
      signal: new AbortController().signal,
      xdgConfigHome: fixture.configHome,
      ledgerPath: fixture.ledgerPath,
      env: {},
      dependencies: { loadDataForSeoAdapter: loadAdapter },
    });

    expect(result.envelope).toMatchObject({
      ok: false,
      error: { code: "PROFILE_ERROR", outcome: "not_dispatched" },
    });
    expect(loadAdapter).not.toHaveBeenCalled();
    expect((await readLedger({ ledgerPath: fixture.ledgerPath })).events).toEqual([]);
  });

  it("routes from the selected manifest adapter key and rejects an unavailable key before secrets", async () => {
    const fixture = await createFixture();
    const document = JSON.parse(JSON.stringify(fixture.manifest.document)) as {
      capabilities: Array<{ adapterKey: string }>;
    };
    document.capabilities[0]!.adapterKey = "backlinks.unreviewed.live";
    const manifest = compileExecutableManifest(document);
    const resolveSecrets = vi.fn(resolveProviderSecrets);
    const loadAdapter = vi.fn(async () => adapter(successResult(24_072)));

    const result = await executeDataForSeoCall({
      command: callCommand(fixture, { dryRun: true }),
      manifest,
      signal: new AbortController().signal,
      xdgConfigHome: fixture.configHome,
      ledgerPath: fixture.ledgerPath,
      env: secretEnvironment(),
      dependencies: {
        resolveProviderSecrets: resolveSecrets,
        loadDataForSeoAdapter: loadAdapter,
      },
    });

    expect(result.envelope).toMatchObject({
      ok: false,
      error: { code: "INTERNAL_ERROR", outcome: "not_dispatched" },
    });
    expect(resolveSecrets).not.toHaveBeenCalled();
    expect(loadAdapter).not.toHaveBeenCalled();
  });

  it("durably authorizes before dispatch, settles provider facts before publishing exact raw bytes", async () => {
    const fixture = await createFixture();
    const events: string[] = [];
    const loadAdapter = vi.fn(async () => {
      events.push("adapter-loaded");
      return adapter(successResult(24_072), () => events.push("transport"));
    });

    const result = await executeDataForSeoCall({
      command: callCommand(fixture),
      manifest: fixture.manifest,
      signal: new AbortController().signal,
      xdgConfigHome: fixture.configHome,
      ledgerPath: fixture.ledgerPath,
      env: secretEnvironment(),
      dependencies: {
        loadDataForSeoAdapter: loadAdapter,
        reserveArtifactDestination: async (options) => {
          const reservation = await reserveArtifactDestination(options);
          return {
            path: reservation.path,
            force: reservation.force,
            publish: async (publication) => {
              events.push("artifact-published");
              return await reservation.publish(publication);
            },
            release: async () => await reservation.release(),
          };
        },
        authorizeIfUnblocked: async (options) => {
          const { authorizeIfUnblocked } = await import("./ledger");
          const authorization = await authorizeIfUnblocked(options);
          events.push("authorized");
          return authorization;
        },
        appendSettled: async (options) => {
          const { appendSettled } = await import("./ledger");
          const settlement = await appendSettled(options);
          events.push("settled");
          return settlement;
        },
      },
    });

    expect(events).toEqual([
      "authorized",
      "adapter-loaded",
      "transport",
      "settled",
      "artifact-published",
    ]);
    expect(result.envelope).toMatchObject({
      ok: true,
      data: { itemsCount: 2, artifact: { bytes: 21 } },
      meta: {
        cost: { amount: "0.024072", currency: "USD" },
        spendOutcome: "confirmed_charged",
        providerRequestId: providerTaskId,
      },
    });
    if (result.envelope.ok) {
      expect(result.envelope.meta.artifact?.path).toBe(await realpath(fixture.outPath));
    }
    expect(await readFile(fixture.outPath, "utf8")).toBe('{"provider":"result"}');
    const ledger = await readLedger({ ledgerPath: fixture.ledgerPath });
    expect(ledger.events.map((event) => event.type)).toEqual(["authorized", "settled"]);
    expect(ledger.attempts[0]?.latestSettlement).toMatchObject({
      outcome: "confirmed_charged",
      costMicros: 24_072,
      policyBreach: false,
    });
  });

  it("settles a policy breach, fails non-retryably, and quarantines that policy revision", async () => {
    const fixture = await createFixture();
    const first = await executeDataForSeoCall({
      command: callCommand(fixture),
      manifest: fixture.manifest,
      signal: new AbortController().signal,
      xdgConfigHome: fixture.configHome,
      ledgerPath: fixture.ledgerPath,
      env: secretEnvironment(),
      dependencies: {
        loadDataForSeoAdapter: async () => adapter(successResult(60_000)),
      },
    });
    expect(first.envelope).toMatchObject({
      ok: false,
      error: {
        code: "SPEND_POLICY_BREACH",
        retryable: false,
        outcome: "confirmed",
      },
      meta: { spendOutcome: "confirmed_charged" },
    });

    const secondFixture = { ...fixture, outPath: join(fixture.root, "second.json") };
    const resolveSecrets = vi.fn(resolveProviderSecrets);
    const second = await executeDataForSeoCall({
      command: callCommand(secondFixture),
      manifest: fixture.manifest,
      signal: new AbortController().signal,
      xdgConfigHome: fixture.configHome,
      ledgerPath: fixture.ledgerPath,
      env: secretEnvironment(),
      dependencies: {
        resolveProviderSecrets: resolveSecrets,
        loadDataForSeoAdapter: async () => adapter(successResult(24_072)),
      },
    });
    expect(second.envelope).toMatchObject({
      ok: false,
      error: { code: "EFFECT_NOT_ALLOWED" },
    });
    expect(resolveSecrets).not.toHaveBeenCalled();
  });

  it("reports a settled policy breach even when raw artifact publication also fails", async () => {
    const fixture = await createFixture();
    const result = await executeDataForSeoCall({
      command: callCommand(fixture),
      manifest: fixture.manifest,
      signal: new AbortController().signal,
      xdgConfigHome: fixture.configHome,
      ledgerPath: fixture.ledgerPath,
      env: secretEnvironment(),
      dependencies: {
        loadDataForSeoAdapter: async () =>
          adapter({
            ...successResult(60_000),
            rawBytes: Buffer.from(
              '{"echo":"super-secret-password"}',
              "utf8",
            ),
          }),
      },
    });

    expect(result.envelope).toMatchObject({
      ok: false,
      error: {
        code: "SPEND_POLICY_BREACH",
        outcome: "confirmed",
        details: { artifactPublication: "failed" },
      },
      meta: {
        spendOutcome: "confirmed_charged",
        artifact: null,
      },
    });
    const ledger = await readLedger({ ledgerPath: fixture.ledgerPath });
    expect(ledger.attempts[0]?.latestSettlement?.policyBreach).toBe(true);
    await expect(readFile(fixture.outPath, "utf8")).rejects.toThrow();
  });

  it("records unknown post-dispatch outcomes and blocks the same input before secrets", async () => {
    const fixture = await createFixture();
    const unknown: DataForSeoDispatchResult = {
      ok: false,
      code: "TIMEOUT",
      message: "The provider timed out with an unknown outcome.",
      retryable: false,
      outcome: "unknown",
      details: null,
      rawBytes: null,
      providerRequestId: null,
      costMicros: null,
      costIsConfirmed: false,
    };
    const first = await executeDataForSeoCall({
      command: callCommand(fixture),
      manifest: fixture.manifest,
      signal: new AbortController().signal,
      xdgConfigHome: fixture.configHome,
      ledgerPath: fixture.ledgerPath,
      env: secretEnvironment(),
      dependencies: { loadDataForSeoAdapter: async () => adapter(unknown) },
    });
    expect(first.envelope).toMatchObject({
      ok: false,
      error: { code: "UNKNOWN_OUTCOME", retryable: false, outcome: "unknown" },
      meta: { spendOutcome: "unknown" },
    });

    const next = { ...fixture, outPath: join(fixture.root, "next.json") };
    const resolveSecrets = vi.fn(resolveProviderSecrets);
    const second = await executeDataForSeoCall({
      command: callCommand(next),
      manifest: fixture.manifest,
      signal: new AbortController().signal,
      xdgConfigHome: fixture.configHome,
      ledgerPath: fixture.ledgerPath,
      env: secretEnvironment(),
      dependencies: { resolveProviderSecrets: resolveSecrets },
    });
    expect(second.envelope).toMatchObject({
      ok: false,
      error: { code: "EFFECT_NOT_ALLOWED" },
    });
    expect(resolveSecrets).not.toHaveBeenCalled();
  });

  it("keeps an unknown provider outcome unknown when its known cost also breaches policy", async () => {
    const fixture = await createFixture();
    const result = await executeDataForSeoCall({
      command: callCommand(fixture),
      manifest: fixture.manifest,
      signal: new AbortController().signal,
      xdgConfigHome: fixture.configHome,
      ledgerPath: fixture.ledgerPath,
      env: secretEnvironment(),
      dependencies: {
        loadDataForSeoAdapter: async () =>
          adapter({
            ok: false,
            code: "UNKNOWN_OUTCOME",
            message: "The provider task was accepted but did not reach a terminal status.",
            retryable: false,
            outcome: "unknown",
            details: null,
            rawBytes: Buffer.from('{"status_code":20100}', "utf8"),
            providerRequestId: createdTaskId,
            costMicros: 60_000,
            costIsConfirmed: true,
          }),
      },
    });

    expect(result.envelope).toMatchObject({
      ok: false,
      error: { code: "UNKNOWN_OUTCOME", outcome: "unknown" },
      meta: {
        spendOutcome: "unknown",
        providerRequestId: createdTaskId,
        cost: { amount: "0.060000" },
      },
    });
    const ledger = await readLedger({ ledgerPath: fixture.ledgerPath });
    expect(ledger.attempts[0]?.latestSettlement).toMatchObject({
      outcome: "unknown",
      costMicros: 60_000,
      policyBreach: true,
    });
  });

  it("uses the conservative observed cost and unknown spend state when provider cost fields disagree", async () => {
    const fixture = await createFixture();
    const result = await executeDataForSeoCall({
      command: callCommand(fixture),
      manifest: fixture.manifest,
      signal: new AbortController().signal,
      xdgConfigHome: fixture.configHome,
      ledgerPath: fixture.ledgerPath,
      env: secretEnvironment(),
      dependencies: {
        loadDataForSeoAdapter: async () =>
          adapter({
            ok: false,
            code: "PROVIDER_ERROR",
            message: "The provider cost fields were inconsistent.",
            retryable: false,
            outcome: "confirmed",
            details: { contract: "dataforseo_cost_unconfirmed" },
            rawBytes: Buffer.from('{"cost":1.024}', "utf8"),
            providerRequestId: providerTaskId,
            costMicros: 1_024_000,
            costIsConfirmed: false,
          }),
      },
    });

    expect(result.envelope).toMatchObject({
      ok: false,
      error: {
        code: "SPEND_POLICY_BREACH",
        outcome: "confirmed",
        hint: expect.stringContaining("Reconcile"),
      },
      meta: {
        cost: { amount: "1.024000" },
        spendOutcome: "unknown",
      },
    });
    const ledger = await readLedger({ ledgerPath: fixture.ledgerPath });
    expect(ledger.attempts[0]?.latestSettlement).toMatchObject({
      outcome: "unknown",
      costMicros: 1_024_000,
      policyBreach: true,
    });
  });

  it("keeps confirmed provider failures correlated with complete spend metadata", async () => {
    for (const code of ["AUTH_FAILED", "RATE_LIMITED", "PROVIDER_ERROR"] as const) {
      const fixture = await createFixture();
      const providerResult: DataForSeoDispatchResult = {
        ok: false,
        code,
        message: "The provider rejected the request.",
        retryable: false,
        outcome: "confirmed",
        details: { httpStatus: code === "RATE_LIMITED" ? 429 : 401 },
        rawBytes: Buffer.from(JSON.stringify({ code }), "utf8"),
        providerRequestId: providerTaskId,
        costMicros: 0,
        costIsConfirmed: true,
      };
      const result = await executeDataForSeoCall({
        command: callCommand(fixture),
        manifest: fixture.manifest,
        signal: new AbortController().signal,
        xdgConfigHome: fixture.configHome,
        ledgerPath: fixture.ledgerPath,
        env: secretEnvironment(),
        dependencies: {
          loadDataForSeoAdapter: async () => adapter(providerResult),
        },
      });

      expect(result.envelope).toMatchObject({
        ok: false,
        error: { code, outcome: "confirmed", retryable: false },
        meta: {
          attemptId: expect.any(String),
          spendOutcome: "confirmed_not_charged",
          providerRequestId: providerTaskId,
        },
      });
    }
  });

  it("never persists a provider-controlled request ID that matches a resolved secret", async () => {
    const fixture = await createFixture();
    const result = await executeDataForSeoCall({
      command: callCommand(fixture),
      manifest: fixture.manifest,
      signal: new AbortController().signal,
      xdgConfigHome: fixture.configHome,
      ledgerPath: fixture.ledgerPath,
      env: {
        TEST_DATAFORSEO_LOGIN: "account@example.com",
        TEST_DATAFORSEO_PASSWORD: credentialShapedTaskId,
      },
      dependencies: {
        loadDataForSeoAdapter: async () =>
          adapter({
            ok: true,
            rawBytes: Buffer.from(
              JSON.stringify({ id: credentialShapedTaskId }),
              "utf8",
            ),
            providerRequestId: credentialShapedTaskId,
            costMicros: 24_072,
            costIsConfirmed: true,
            data: { itemsCount: 2 },
          }),
      },
    });

    expect(result.envelope).toMatchObject({
      ok: false,
      error: { code: "LOCAL_IO_ERROR", outcome: "confirmed" },
      meta: { providerRequestId: null, spendOutcome: "confirmed_charged" },
    });
    expect(await readFile(fixture.ledgerPath, "utf8")).not.toContain(
      credentialShapedTaskId,
    );
    const ledger = await readLedger({ ledgerPath: fixture.ledgerPath });
    expect(ledger.attempts[0]?.latestSettlement?.providerRequestId).toBeNull();
  });

  it("exits 130 when SIGINT arrives after durable settlement but before publication completes", async () => {
    const fixture = await createFixture();
    const controller = new AbortController();
    const result = await executeDataForSeoCall({
      command: callCommand(fixture),
      manifest: fixture.manifest,
      signal: controller.signal,
      xdgConfigHome: fixture.configHome,
      ledgerPath: fixture.ledgerPath,
      env: secretEnvironment(),
      dependencies: {
        loadDataForSeoAdapter: async () => adapter(successResult(24_072)),
        appendSettled: async (options) => {
          const { appendSettled } = await import("./ledger");
          const settlement = await appendSettled(options);
          controller.abort(new Error("SIGINT"));
          return settlement;
        },
      },
    });

    expect(result.envelope).toMatchObject({ ok: true });
    expect(result.exitCode).toBe(130);
    expect(await readFile(fixture.outPath, "utf8")).toBe('{"provider":"result"}');
  });

  it("preserves LOCAL_IO_ERROR when SIGINT is followed by a failed pre-dispatch settlement", async () => {
    const fixture = await createFixture();
    const controller = new AbortController();
    const result = await executeDataForSeoCall({
      command: callCommand(fixture),
      manifest: fixture.manifest,
      signal: controller.signal,
      xdgConfigHome: fixture.configHome,
      ledgerPath: fixture.ledgerPath,
      env: secretEnvironment(),
      dependencies: {
        authorizeIfUnblocked: async (options) => {
          const event = await authorizeIfUnblocked(options);
          controller.abort(new Error("SIGINT"));
          return event;
        },
        appendSettled: async () => {
          throw new LedgerError(
            "LEDGER_IO_ERROR",
            "simulated settlement fsync failure",
            fixture.ledgerPath,
          );
        },
      },
    });

    expect(result.exitCode).toBe(130);
    expect(result.envelope).toMatchObject({
      ok: false,
      error: {
        code: "LOCAL_IO_ERROR",
        outcome: "not_dispatched",
        hint: expect.stringContaining("ledger"),
      },
      meta: { attemptId: expect.any(String) },
    });
    const ledger = await readLedger({ ledgerPath: fixture.ledgerPath });
    expect(ledger.events.map((event) => event.type)).toEqual(["authorized"]);
  });

  it("returns confirmed LOCAL_IO_ERROR with artifact receipt when settlement append fails", async () => {
    const fixture = await createFixture();
    const result = await executeDataForSeoCall({
      command: callCommand(fixture),
      manifest: fixture.manifest,
      signal: new AbortController().signal,
      xdgConfigHome: fixture.configHome,
      ledgerPath: fixture.ledgerPath,
      env: secretEnvironment(),
      dependencies: {
        loadDataForSeoAdapter: async () => adapter(successResult(24_072)),
        appendSettled: async () => {
          throw new Error("simulated fsync failure");
        },
      },
    });

    expect(result.envelope).toMatchObject({
      ok: false,
      error: {
        code: "LOCAL_IO_ERROR",
        retryable: false,
        outcome: "confirmed",
      },
      meta: {
        artifact: { bytes: 21 },
        spendOutcome: "confirmed_charged",
      },
    });
    expect(await readFile(fixture.outPath, "utf8")).toBe('{"provider":"result"}');
  });
});

type Fixture = Awaited<ReturnType<typeof createFixture>>;

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), "gkit-execute-test-"));
  temporaryDirectories.push(root);
  const configHome = join(root, "config");
  const profiles = join(configHome, "gkit", "profiles");
  await mkdir(profiles, { recursive: true });
  await writeFile(
    join(profiles, "app-a.json"),
    JSON.stringify({
      version: 1,
      name: "app-a",
      providers: {
        dataforseo: {
          config: { environment: "production" },
          policy: { maxSpendUsdPerCall: "0.10" },
          secrets: {
            login: "env:TEST_DATAFORSEO_LOGIN",
            password: "env:TEST_DATAFORSEO_PASSWORD",
          },
        },
      },
    }),
  );
  const requestPath = join(root, "request.json");
  await writeFile(
    requestPath,
    JSON.stringify({
      targets: ["clonesite.ai", "example.com"],
      rank_scale: "one_hundred",
    }),
  );
  return {
    root,
    configHome,
    requestPath,
    outPath: join(root, "result.json"),
    ledgerPath: join(root, "state", "gkit", "ledger.jsonl"),
    manifest: await loadExecutableManifest(manifestPath),
  };
}

function callCommand(
  fixture: Fixture,
  overrides: Partial<Extract<ParsedCommand, { kind: "dataforseo-call" }>> = {},
): Extract<ParsedCommand, { kind: "dataforseo-call" }> {
  return {
    kind: "dataforseo-call",
    profileFlag: "app-a",
    operationId: "dataforseo.backlinks.bulk_ranks.live",
    input: `@${fixture.requestPath}`,
    allowSpend: true,
    maxSpendUsd: "0.05",
    out: fixture.outPath,
    force: false,
    dryRun: false,
    ...overrides,
  };
}

function secretEnvironment(): Readonly<Record<string, string>> {
  return {
    TEST_DATAFORSEO_LOGIN: "account@example.com",
    TEST_DATAFORSEO_PASSWORD: "super-secret-password",
  };
}

function successResult(costMicros: number): DataForSeoDispatchResult {
  return {
    ok: true,
    rawBytes: Buffer.from('{"provider":"result"}', "utf8"),
    providerRequestId: providerTaskId,
    costMicros,
    costIsConfirmed: true,
    data: { itemsCount: 2 },
  };
}

function adapter(
  result: DataForSeoDispatchResult,
  onDispatch: () => void = () => undefined,
) {
  return {
    dispatchDataForSeoBulkRanks: async () => {
      onDispatch();
      return result;
    },
  };
}
