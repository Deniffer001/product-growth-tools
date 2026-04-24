/**
 * @input bundled skill registry and current invocation root
 * @output skill path, skill markdown, or local/global .agents installation
 * @pos self-install bootstrap for agent-facing GSC CLI skills
 */

import { existsSync, readFileSync } from "node:fs";
import { cp, mkdir, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CliContext } from "../client";
import { runCliCommand } from "../lib/command-support";
import { cliError } from "../lib/errors";

const cliDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(cliDir, "..");
const installRepo = "product-growth-tools";

const bundledSkills = {
  "gsc-cli": {
    id: "gsc-cli",
    sourceDir: resolve(packageRoot, "skills/gsc-cli"),
    description: "Google Search Console provider-read skill for agents",
  },
} as const;

type SkillId = keyof typeof bundledSkills;

type SkillInput = {
  skill?: string;
};

type SkillInstallInput = SkillInput & {
  global?: boolean;
  force?: boolean;
};

function resolveSkill(skill?: string) {
  const id = (skill ?? "gsc-cli") as SkillId;
  const found = bundledSkills[id];

  if (!found) {
    throw cliError({
      code: "invalid_input",
      message: `Unknown bundled skill: ${skill}`,
      hint: `Available skills: ${Object.keys(bundledSkills).join(", ")}`,
    });
  }

  return found;
}

function invocationRoot() {
  return process.env.INIT_CWD ?? process.cwd();
}

function targetRoot(global?: boolean) {
  if (global) {
    return resolve(homedir(), ".agents/skills", installRepo);
  }

  return resolve(
    invocationRoot(),
    ".agents/skills",
    installRepo
  );
}

function skillMarkdownPath(sourceDir: string) {
  return resolve(sourceDir, "SKILL.md");
}

export async function handleSkillPath(args: {
  input: SkillInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const skill = resolveSkill(args.input.skill);

    services.output.success({
      skill: skill.id,
      path: skillMarkdownPath(skill.sourceDir),
      sourceDir: skill.sourceDir,
    });
  });
}

export async function handleSkillPrint(args: {
  input: SkillInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const skill = resolveSkill(args.input.skill);
    const path = skillMarkdownPath(skill.sourceDir);

    services.output.success({
      skill: skill.id,
      path,
      markdown: readFileSync(path, "utf8"),
    });
  });
}

export async function handleSkillInstall(args: {
  input: SkillInstallInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const skill = resolveSkill(args.input.skill);
    const targetDir = resolve(targetRoot(args.input.global), skill.id);
    const alreadyInstalled = existsSync(targetDir);

    if (alreadyInstalled && !args.input.force) {
      services.output.success({
        installed: false,
        alreadyInstalled: true,
        skill: skill.id,
        source: skill.sourceDir,
        target: targetDir,
        scope: args.input.global ? "global" : "local",
      });
      return;
    }

    await mkdir(dirname(targetDir), { recursive: true });
    if (alreadyInstalled) {
      await rm(targetDir, { force: true, recursive: true });
    }
    await cp(skill.sourceDir, targetDir, { recursive: true });

    services.output.success({
      installed: true,
      alreadyInstalled,
      skill: skill.id,
      source: skill.sourceDir,
      target: targetDir,
      scope: args.input.global ? "global" : "local",
    });
  });
}
