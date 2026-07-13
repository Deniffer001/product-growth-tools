/**
 * @input bundled gsc skill and temporary invocation roots
 * @output coverage for self-installing skills into standard .agents roots
 * @pos bootstrap contract tests for downstream agent skill registration
 */

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const cliDir = dirname(fileURLToPath(import.meta.url));

function runCli(args: string[], env: NodeJS.ProcessEnv = process.env) {
  const result = spawnSync("bun", ["run", "./index.ts", ...args], {
    cwd: cliDir,
    encoding: "utf8",
    env,
  });

  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

describe("gsc skill install", () => {
  test("installs bundled skill into invocation .agents root", async () => {
    const root = await mkdtemp(join(tmpdir(), "gsc-skill-install-"));

    try {
      const result = runCli(["skill", "install"], {
        ...process.env,
        INIT_CWD: root,
      });

      expect(result.status).toBe(0);

      const payload = JSON.parse(result.stdout) as {
        ok: boolean;
        data: { installed: boolean; target: string };
      };
      expect(payload.ok).toBe(true);
      expect(payload.data.installed).toBe(true);
      expect(payload.data.target).toBe(resolve(root, ".agents/skills/gkit/gsc-cli"));

      const installed = await readFile(join(payload.data.target, "SKILL.md"), "utf8");
      expect(installed).toContain("name: gsc-cli");
      expect(installed).toContain("gsc doctor dataset readiness");
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });
});
