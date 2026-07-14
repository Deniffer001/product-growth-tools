import { describe, expect, it } from "vitest";

import { parseArgs } from "./args";

describe("gkit argv parser", () => {
  it("accepts the public spaced command and global profile", () => {
    expect(
      parseArgs([
        "--profile",
        "app-a",
        "dataforseo",
        "api",
        "call",
        "--operation-id",
        "dataforseo.backlinks.bulk_ranks.live",
        "--input",
        "@req.json",
        "--allow-spend",
        "--max-spend-usd",
        "0.05",
        "--out",
        "r.json",
      ]),
    ).toEqual({
      kind: "dataforseo-call",
      profileFlag: "app-a",
      operationId: "dataforseo.backlinks.bulk_ranks.live",
      input: "@req.json",
      allowSpend: true,
      maxSpendUsd: "0.05",
      out: "r.json",
      force: false,
      dryRun: false,
    });
  });

  it("keeps discovery commands profile-free", () => {
    expect(parseArgs(["--schema"])).toEqual({ kind: "schema", selector: null });
    expect(parseArgs(["describe", "--id", "capability"])).toEqual({
      kind: "describe",
      id: "capability",
    });
    expect(() => parseArgs(["--profile", "app-a", "--schema"])).toThrow(
      "--schema does not load a profile",
    );
    expect(parseArgs(["ledger"])).toEqual({ kind: "ledger-status" });
    expect(parseArgs(["ledger", "status"])).toEqual({ kind: "ledger-status" });
  });

  it("accepts the read-only PostHog command without spend flags", () => {
    expect(
      parseArgs([
        "--profile",
        "app-a",
        "posthog",
        "api",
        "call",
        "--operation-id",
        "posthog.query.run",
        "--input",
        "@req.json",
        "--out",
        "result.json",
        "--dry-run",
      ]),
    ).toEqual({
      kind: "posthog-call",
      profileFlag: "app-a",
      operationId: "posthog.query.run",
      input: "@req.json",
      out: "result.json",
      force: false,
      dryRun: true,
    });
    expect(() =>
      parseArgs([
        "posthog",
        "api",
        "call",
        "--operation-id",
        "posthog.query.run",
        "--input",
        "@req.json",
        "--allow-spend",
      ]),
    ).toThrow("Unknown flag");
  });

  it("rejects unknown or duplicate flags before execution", () => {
    expect(() =>
      parseArgs([
        "dataforseo",
        "api",
        "call",
        "--operation-id",
        "id",
        "--operation-id",
        "id-2",
        "--input",
        "@req.json",
      ]),
    ).toThrow("Duplicate flag");
    expect(() =>
      parseArgs([
        "dataforseo",
        "api",
        "call",
        "--operation-id",
        "id",
        "--input",
        "@req.json",
        "--unknown",
        "value",
      ]),
    ).toThrow("Unknown flag");
    expect(() =>
      parseArgs(["--profile", "app-a", "--profile=app-b", "dataforseo", "doctor"]),
    ).toThrow("--profile may be provided only once");
  });
});
