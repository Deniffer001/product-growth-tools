/**
 * @input spawned CLI process and schema inspection arguments
 * @output coverage for discoverable command-tree shape and selector detail
 * @pos schema contract tests for page-extract CLI
 */

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const cliDir = dirname(fileURLToPath(import.meta.url));

function stripAnsi(text: string) {
  let output = "";
  let index = 0;

  while (index < text.length) {
    const char = text[index];

    if (char === "\u001B" && text[index + 1] === "[") {
      index += 2;
      while (index < text.length) {
        const code = text.charCodeAt(index);
        index += 1;

        if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
          break;
        }
      }
      continue;
    }

    output += char;
    index += 1;
  }

  return output;
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

describe("page-extract schema", () => {
  test("groups commands by domain before intent", () => {
    const result = runCli(["--schema"]);

    expect(result.status).toBe(0);
    expect(extractOutline(result.stdout)).toContain("page: {");
    expect(extractOutline(result.stdout)).toContain(
      "extract(input: { url: string; provider?: string; screenshot?: boolean; screenshotOutput?: string })"
    );
  });

  test("exposes page extract selector with agent-friendly flags", () => {
    const result = runCli(["--schema=.page.entity.extract"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("extract(");
    expect(result.stdout).toContain("url: string");
    expect(result.stdout).toContain("provider?: string");
    expect(result.stdout).toContain("screenshot?: boolean");
    expect(result.stdout).toContain("screenshotOutput?: string");
  });
});
