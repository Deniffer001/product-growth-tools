/**
 * @input spawned CLI process and schema inspection arguments
 * @output coverage for discoverable command-tree shape and selector detail
 * @pos schema contract tests for posthog CLI
 */

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const cliDir = dirname(fileURLToPath(import.meta.url));

function stripAnsi(text: string) {
  return text.replace(/\u001B\[[0-9;]*[A-Za-z]/g, "");
}

function runCli(args: string[]) {
  const result = spawnSync("bun", ["run", "./index.ts", ...args], {
    cwd: resolve(cliDir),
    encoding: "utf8",
    env: process.env,
  });

  return {
    ...result,
    stdout: stripAnsi(result.stdout),
    stderr: stripAnsi(result.stderr),
  };
}

function extractOutline(stdout: string) {
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !line.startsWith("Schema too large") &&
        !line.startsWith("hint:")
    );
}

describe("posthog schema", () => {
  test("groups commands by provider domain before intent", () => {
    const result = runCli(["--schema"]);

    expect(result.status).toBe(0);
    expect(extractOutline(result.stdout)).toContain(
      "doctor{dataset{readiness}}"
    );
    expect(extractOutline(result.stdout)).toContain(
      "query{dataset{results},action{run}}"
    );
    expect(extractOutline(result.stdout)).toContain("event{dataset{counts,map}}");
    expect(extractOutline(result.stdout)).toContain("funnel{analyze}");
    expect(extractOutline(result.stdout)).toContain(
      "audit{dataset{instrumentation}}"
    );
    expect(extractOutline(result.stdout)).toContain("profile{validate}");
    expect(extractOutline(result.stdout)).toContain(
      "project{dataset{event-definitions,property-definitions}}"
    );
    expect(extractOutline(result.stdout)).toContain(
      "feature-flag{dataset{flags}}"
    );
  });

  test("exposes query results selector with limit guard flags", () => {
    const result = runCli(["--schema=.query.dataset.results"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("results(");
    expect(result.stdout).toContain("query: string");
    expect(result.stdout).toContain("limit?: number | string");
    expect(result.stdout).toContain("noLimitGuard?: boolean");
    expect(result.stdout).toContain("raw?: boolean");
  });

  test("exposes query artifact action inputs", () => {
    const result = runCli(["--schema=.query.action.run"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("run(");
    expect(result.stdout).toContain("request: string");
    expect(result.stdout).toContain("out: string");
  });

  test("exposes event counts and funnel analysis inputs", () => {
    const eventResult = runCli(["--schema=.event.dataset.counts"]);
    const eventMapResult = runCli(["--schema=.event.dataset.map"]);
    const funnelResult = runCli(["--schema=.funnel.analyze"]);

    expect(eventResult.status).toBe(0);
    expect(eventResult.stdout).toContain("window?: string");
    expect(eventResult.stdout).toContain("from?: string");
    expect(eventResult.stdout).toContain("to?: string");
    expect(eventResult.stdout).toContain("events?: string");
    expect(eventResult.stdout).toContain("q?: string");

    expect(eventMapResult.status).toBe(0);
    expect(eventMapResult.stdout).toContain("window?: string");
    expect(eventMapResult.stdout).toContain("from?: string");
    expect(eventMapResult.stdout).toContain("to?: string");
    expect(eventMapResult.stdout).toContain("limit?: number | string");

    expect(funnelResult.status).toBe(0);
    expect(funnelResult.stdout).toContain("events?: string");
    expect(funnelResult.stdout).toContain("preset?: string");
    expect(funnelResult.stdout).toContain("window?: string");
    expect(funnelResult.stdout).toContain("from?: string");
    expect(funnelResult.stdout).toContain("to?: string");
  });

  test("exposes profile validation and instrumentation audit inputs", () => {
    const profileResult = runCli(["--schema=.profile.validate"]);
    const auditResult = runCli(["--schema=.audit.dataset.instrumentation"]);

    expect(profileResult.status).toBe(0);
    expect(profileResult.stdout).toContain("validate(");

    expect(auditResult.status).toBe(0);
    expect(auditResult.stdout).toContain("events?: string");
    expect(auditResult.stdout).toContain("preset?: string");
    expect(auditResult.stdout).toContain("from?: string");
    expect(auditResult.stdout).toContain("to?: string");
  });
});
