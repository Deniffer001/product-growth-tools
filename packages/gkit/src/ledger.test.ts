import { afterEach, describe, expect, it } from "vitest";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  LedgerError,
  SpendBlockedError,
  appendSettled,
  authorizeIfUnblocked,
  defaultLedgerPath,
  getSpendBlockers,
  readLedger,
  type AuthorizedSpendInput,
} from "./ledger";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(async (directory) => {
      await rm(directory, { recursive: true, force: true });
    }),
  );
});

describe("spend ledger", () => {
  it("uses absolute XDG/HOME locations and rejects relative state roots", () => {
    expect(defaultLedgerPath({ XDG_STATE_HOME: "/tmp/gkit-state" })).toBe(
      "/tmp/gkit-state/gkit/ledger.jsonl",
    );
    expect(defaultLedgerPath({ HOME: "/tmp/gkit-home" })).toBe(
      "/tmp/gkit-home/.local/state/gkit/ledger.jsonl",
    );
    expect(() => defaultLedgerPath({ XDG_STATE_HOME: "relative-state" })).toThrow(
      LedgerError,
    );
    expect(() => defaultLedgerPath({ HOME: "relative-home" })).toThrow(LedgerError);
  });

  it("blocks an unsettled or unknown same-input attempt until evidence-backed reconciliation", async () => {
    const ledgerPath = await temporaryLedgerPath();
    const inputSha256 = "a".repeat(64);
    await authorizeIfUnblocked({
      ledgerPath,
      authorization: authorization("attempt-1", inputSha256),
    });

    expect(await blockersFor(ledgerPath, inputSha256)).toMatchObject([
      { reason: "unsettled_attempt", attemptId: "attempt-1" },
    ]);
    await expectSpendBlocked(
      authorizeIfUnblocked({
        ledgerPath,
        authorization: authorization("attempt-2", inputSha256),
      }),
      "unsettled_attempt",
    );

    await appendSettled({
      ledgerPath,
      settlement: {
        attemptId: "attempt-1",
        outcome: "unknown",
        costMicros: null,
        providerRequestId: "task-1",
      },
    });
    expect(await blockersFor(ledgerPath, inputSha256)).toMatchObject([
      { reason: "unknown_outcome", attemptId: "attempt-1" },
    ]);

    await appendSettled({
      ledgerPath,
      settlement: {
        attemptId: "attempt-1",
        outcome: "confirmed_not_charged",
        costMicros: 0,
        providerRequestId: "task-1",
        settlementSource: "manual",
        evidenceRef: "provider-console:task-1",
      },
    });
    expect(await blockersFor(ledgerPath, inputSha256)).toEqual([]);

    const next = await authorizeIfUnblocked({
      ledgerPath,
      authorization: authorization("attempt-2", inputSha256),
    });
    expect(next.type).toBe("authorized");
    expect((await stat(ledgerPath)).mode & 0o777).toBe(0o600);
  });

  it("computes policy breach from actual cost and quarantines only that reviewed revision", async () => {
    const ledgerPath = await temporaryLedgerPath();
    await authorizeIfUnblocked({
      ledgerPath,
      authorization: authorization("attempt-1", "b".repeat(64), "cost-v1", 50_000),
    });

    const settlement = await appendSettled({
      ledgerPath,
      settlement: {
        attemptId: "attempt-1",
        outcome: "confirmed_charged",
        costMicros: 60_000,
        providerRequestId: "task-1",
      },
    });
    expect(settlement.policyBreach).toBe(true);

    await expectSpendBlocked(
      authorizeIfUnblocked({
        ledgerPath,
        authorization: authorization("attempt-2", "c".repeat(64), "cost-v1", 50_000),
      }),
      "policy_breach",
    );

    const newRevision = await authorizeIfUnblocked({
      ledgerPath,
      authorization: authorization("attempt-3", "c".repeat(64), "cost-v2", 70_000),
    });
    expect(newRevision.costPolicyRevision).toBe("cost-v2");
  });

  it("rejects charged manual reconciliation without an evidenced cost", async () => {
    const ledgerPath = await temporaryLedgerPath();
    await authorizeIfUnblocked({
      ledgerPath,
      authorization: authorization("attempt-1", "d".repeat(64)),
    });
    await appendSettled({
      ledgerPath,
      settlement: {
        attemptId: "attempt-1",
        outcome: "unknown",
        costMicros: null,
      },
    });

    try {
      await appendSettled({
        ledgerPath,
        settlement: {
          attemptId: "attempt-1",
          outcome: "confirmed_charged",
          costMicros: null,
          settlementSource: "manual",
          evidenceRef: "provider-console:task-1",
        },
      });
      throw new Error("Expected charged reconciliation without cost to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(LedgerError);
      expect((error as LedgerError).code).toBe("INVALID_LEDGER_EVENT");
    }

    await expect(
      appendSettled({
        ledgerPath,
        settlement: {
          attemptId: "attempt-1",
          outcome: "confirmed_charged",
          costMicros: 0,
          settlementSource: "manual",
          evidenceRef: "provider-console:task-1",
        },
      }),
    ).rejects.toMatchObject({ code: "INVALID_LEDGER_EVENT" });
  });

  it("serializes independent process appends into complete canonical JSON lines", async () => {
    const ledgerPath = await temporaryLedgerPath();
    const moduleUrl = new URL("./ledger.ts", import.meta.url).href;
    const processCount = 8;
    const subprocesses = Array.from({ length: processCount }, (_, index) => {
      const input = authorization(`process-attempt-${index}`, index.toString(16).padStart(64, "0"));
      const script = [
        `import { authorizeIfUnblocked } from ${JSON.stringify(moduleUrl)};`,
        `await authorizeIfUnblocked(${JSON.stringify({ ledgerPath, authorization: input })});`,
      ].join("\n");
      const subprocess = spawn("bun", ["-e", script]);
      subprocess.stdin.end();
      return subprocess;
    });

    const results = await Promise.all(subprocesses.map(waitForSubprocess));
    if (results.some((result) => result.exitCode !== 0)) {
      throw new Error(
        `Concurrent ledger writer failed: ${results.map((result) => result.stderr).join("\n")}`,
      );
    }

    const contents = await readFile(ledgerPath, "utf8");
    expect(contents.endsWith("\n")).toBe(true);
    const lines = contents.trimEnd().split("\n");
    expect(lines).toHaveLength(processCount);
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
      const keys = Object.keys(JSON.parse(line) as Record<string, unknown>);
      expect(keys).toEqual([...keys].sort());
    }

    const snapshot = await readLedger({ ledgerPath });
    expect(snapshot.attempts).toHaveLength(processCount);
  }, 20_000);

  it("allows exactly one authorization when independent processes race the same input", async () => {
    const ledgerPath = await temporaryLedgerPath();
    const moduleUrl = new URL("./ledger.ts", import.meta.url).href;
    const processCount = 6;
    const inputSha256 = "e".repeat(64);
    const subprocesses = Array.from({ length: processCount }, (_, index) => {
      const input = authorization(`same-input-${index}`, inputSha256);
      const script = [
        `import { authorizeIfUnblocked } from ${JSON.stringify(moduleUrl)};`,
        "try {",
        `  await authorizeIfUnblocked(${JSON.stringify({ ledgerPath, authorization: input })});`,
        "} catch (error) {",
        "  if (error?.code === 'SPEND_BLOCKED' && error.blockers?.some((blocker) => blocker.reason === 'unsettled_attempt')) {",
        "    console.error('SPEND_BLOCKED:unsettled_attempt');",
        "    process.exit(2);",
        "  }",
        "  throw error;",
        "}",
      ].join("\n");
      const subprocess = spawn("bun", ["-e", script]);
      subprocess.stdin.end();
      return subprocess;
    });

    const results = await Promise.all(subprocesses.map(waitForSubprocess));
    expect(results.filter((result) => result.exitCode === 0)).toHaveLength(1);
    expect(results.filter((result) => result.exitCode !== 0)).toHaveLength(
      processCount - 1,
    );
    expect(
      results
        .filter((result) => result.exitCode !== 0)
        .every((result) => result.stderr.includes("SPEND_BLOCKED:unsettled_attempt")),
    ).toBe(true);
    const snapshot = await readLedger({ ledgerPath });
    expect(snapshot.events).toHaveLength(1);
    expect(snapshot.attempts).toHaveLength(1);
    expect(snapshot.attempts[0]?.authorization.inputSha256).toBe(inputSha256);
  }, 20_000);
});

function authorization(
  attemptId: string,
  inputSha256: string,
  costPolicyRevision = "cost-v1",
  maxCostMicros = 50_000,
): AuthorizedSpendInput {
  return {
    attemptId,
    profile: "app-a",
    provider: "dataforseo",
    capability: "dataforseo.backlinks.bulk_ranks.live",
    manifestRevision: "manifest-v1",
    costPolicyRevision,
    inputSha256,
    maxCostMicros,
    acknowledgement: {
      allowSpend: true,
      invocationMaxCostMicros: maxCostMicros,
    },
    currency: "USD",
  };
}

async function blockersFor(ledgerPath: string, inputSha256: string) {
  return await getSpendBlockers({
    ledgerPath,
    profile: "app-a",
    provider: "dataforseo",
    capability: "dataforseo.backlinks.bulk_ranks.live",
    costPolicyRevision: "cost-v1",
    inputSha256,
  });
}

async function expectSpendBlocked(
  promise: Promise<unknown>,
  reason: "policy_breach" | "unknown_outcome" | "unsettled_attempt",
): Promise<void> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(SpendBlockedError);
    expect((error as SpendBlockedError).blockers.some((blocker) => blocker.reason === reason)).toBe(
      true,
    );
    return;
  }
  throw new Error("Expected spend authorization to be blocked.");
}

async function temporaryLedgerPath(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "gkit-ledger-test-"));
  temporaryDirectories.push(directory);
  return join(directory, "state", "ledger.jsonl");
}

async function waitForSubprocess(
  subprocess: ChildProcessWithoutNullStreams,
): Promise<{ exitCode: number; stderr: string }> {
  let stderr = "";
  subprocess.stderr.setEncoding("utf8");
  subprocess.stderr.on("data", (chunk: string) => {
    stderr += chunk;
  });

  const exitCode = await new Promise<number>((resolveExit, rejectExit) => {
    subprocess.once("error", rejectExit);
    subprocess.once("exit", (code) => {
      resolveExit(code ?? -1);
    });
  });
  return { exitCode, stderr };
}
