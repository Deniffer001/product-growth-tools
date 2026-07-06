/**
 * @input spawned CLI process and schema inspection arguments
 * @output coverage for discoverable command-tree shape and selector detail
 * @pos schema contract tests for backlink CLI
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

describe("backlink schema", () => {
  test("exposes expected command paths", () => {
    const result = runCli(["--schema"]);

    expect(result.status).toBe(0);
    expect(extractOutline(result.stdout)).toContain(
      "doctor{dataset{readiness}}"
    );
    expect(extractOutline(result.stdout)).toContain(
      "domain{dataset{summary,referringDomains,anchors}}"
    );
    expect(extractOutline(result.stdout)).toContain(
      "page{dataset{summary,backlinks,anchors}}"
    );
  });

  test("exposes page backlinks selector with provider flags", () => {
    const result = runCli(["--schema=.page.dataset.backlinks"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("backlinks(");
    expect(result.stdout).toContain("target: string");
    expect(result.stdout).toContain("limit?: number");
    expect(result.stdout).toContain("offset?: number");
    expect(result.stdout).toContain("orderBy?: string");
  });
});
