/**
 * @input CLI services and optional Python bootstrap binary
 * @output managed Python provider install result
 * @pos public runtime action for preparing Google Ads Python SDK dependency
 */

import { spawn } from "node:child_process";
import { dirname } from "node:path";
import type { CliContext } from "../client";
import { getProviderRuntimeState } from "../client";
import { cliError } from "../lib/errors";
import { runCliCommand } from "../lib/command-support";

type InstallResult = {
  venvPath: string;
  pythonBin: string;
  requirementsPath: string;
  installed: boolean;
};

function runProcess(args: {
  command: string;
  argv: string[];
  cwd: string;
  failureHint: string;
}) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(args.command, args.argv, {
      cwd: args.cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk: string) => stderrChunks.push(chunk));
    child.on("error", (error) => {
      reject(
        cliError({
          code: "backend_failure",
          message: error.message,
          hint: args.failureHint,
        })
      );
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        cliError({
          code: "backend_failure",
          message:
            stderrChunks.join("").trim() ||
            stdoutChunks.join("").trim() ||
            `${args.command} exited with code ${code ?? "unknown"}.`,
          hint: args.failureHint,
        })
      );
    });
  });
}

function renderInstall(data: InstallResult) {
  return [
    "Google Ads Python provider installed.",
    `venv: ${data.venvPath}`,
    `python: ${data.pythonBin}`,
    `requirements: ${data.requirementsPath}`,
  ];
}

export async function handleProviderInstallAction(args: {
  context: CliContext;
  input: { pythonBin?: string };
}) {
  await runCliCommand(args.context, async (services) => {
    const runtime = getProviderRuntimeState();
    const bootstrapPython = args.input.pythonBin ?? "python3";

    await runProcess({
      command: bootstrapPython,
      argv: ["-m", "venv", runtime.providerVenvPath],
      cwd: dirname(runtime.providerVenvPath),
      failureHint:
        "Install Python 3 with venv support, or pass --python-bin <path>.",
    });

    const installedRuntime = getProviderRuntimeState();

    await runProcess({
      command: installedRuntime.pythonBin,
      argv: [
        "-m",
        "pip",
        "install",
        "-r",
        installedRuntime.providerRequirementsPath,
      ],
      cwd: dirname(runtime.providerVenvPath),
      failureHint:
        "Check network access and requirements.txt, then rerun google-ads provider action install.",
    });

    services.output.success(
      {
        venvPath: installedRuntime.providerVenvPath,
        pythonBin: installedRuntime.pythonBin,
        requirementsPath: installedRuntime.providerRequirementsPath,
        installed: true,
      },
      renderInstall
    );
  });
}
