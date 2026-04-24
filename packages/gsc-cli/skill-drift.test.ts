/**
 * @input gsc skill examples and live CLI schema discovery output
 * @output guardrail that documented agent commands still exist in schema
 * @pos drift test between agent-facing skill instructions and CLI command tree
 */

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const cliDir = dirname(fileURLToPath(import.meta.url));
const skillPath = resolve(cliDir, "skills/gsc-cli/SKILL.md");

function stripAnsi(text: string) {
  return text.replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, "");
}

function runSchema(selector: string) {
  const result = spawnSync("bun", ["run", "./index.ts", `--schema=${selector}`], {
    cwd: cliDir,
    encoding: "utf8",
    env: process.env,
  });

  return {
    status: result.status,
    stdout: stripAnsi(result.stdout),
    stderr: stripAnsi(result.stderr),
  };
}

function extractBashCommands(markdown: string) {
  const commands: string[] = [];
  const blockPattern = /```bash\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = blockPattern.exec(markdown))) {
    for (const rawLine of match[1].split("\n")) {
      const line = rawLine.trim();
      if (line.startsWith("gsc ")) {
        commands.push(line);
      }
    }
  }

  return commands;
}

function commandSelector(command: string) {
  const tokens = command.split(/\s+/).slice(1);
  const path = [];

  for (const token of tokens) {
    if (token.startsWith("--")) {
      break;
    }
    path.push(token);
  }

  return path.length > 0 ? `.${path.join(".")}` : null;
}

describe("gsc skill examples", () => {
  test("documented commands are discoverable from --schema", () => {
    const skill = readFileSync(skillPath, "utf8");
    const selectors = extractBashCommands(skill)
      .map(commandSelector)
      .filter((selector): selector is string => Boolean(selector));

    expect(selectors).toContain(".doctor.dataset.readiness");
    expect(selectors).toContain(".skill.install");
    expect(selectors.length).toBeGreaterThan(4);

    for (const selector of selectors) {
      const result = runSchema(selector);

      expect(result.status, `${selector}\n${result.stderr}`).toBe(0);
      expect(result.stdout, selector).not.toContain("Invalid schema selector");
    }
  }, 15000);
});
