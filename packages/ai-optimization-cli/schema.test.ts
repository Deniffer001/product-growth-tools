/**
 * @input spawned CLI process and schema inspection arguments
 * @output coverage for discoverable command-tree shape and selector detail
 * @pos schema contract tests for AI Optimization CLI
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

describe("ai-optimization schema", () => {
  test("groups commands by API area before intent", () => {
    const result = runCli(["--schema"]);

    expect(result.status).toBe(0);
    expect(extractOutline(result.stdout)).toContain(
      "doctor{dataset{readiness}}"
    );
    expect(extractOutline(result.stdout)).toContain(
      "llmResponse{dataset{models},entity{live}}"
    );
    expect(extractOutline(result.stdout)).toContain(
      "llmMention{dataset{locationsAndLanguages,availableFilters,search,topPages,topDomains,aggregatedMetrics,crossAggregatedMetrics}}"
    );
  });

  test("exposes LLM response live selector with agent-friendly flags", () => {
    const result = runCli(["--schema=.llmResponse.entity.live"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("live(");
    expect(result.stdout).toContain("prompt: string");
    expect(result.stdout).toContain("modelName: string");
    expect(result.stdout).toContain("webSearch?: boolean");
    expect(result.stdout).toContain("messageChainJson?: string");
  });

  test("exposes LLM mention search selector with target and filter flags", () => {
    const result = runCli(["--schema=.llmMention.dataset.search"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("search(");
    expect(result.stdout).toContain("domain?: string");
    expect(result.stdout).toContain("keyword?: string");
    expect(result.stdout).toContain("targetJson?: string");
    expect(result.stdout).toContain("filtersJson?: string");
    expect(result.stdout).toContain("limit?: number");
  });
});
