/**
 * @input CLI output mode plus success or error payloads
 * @output agent-first JSON output with optional pretty rendering
 * @pos serialization boundary between PostHog handlers and terminal
 */

import { inspect } from "node:util";
import type { CliContext } from "./context";
import { normalizeCliError } from "./lib/errors";

export type Output<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; hint?: string } };

export type HumanLines<T> = string[] | ((data: T) => string[]);

export type OutputService = {
  success: <T>(data: T, human?: HumanLines<T>) => void;
  error: (error: unknown, human?: string[]) => void;
};

function printJson<T>(value: Output<T>) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function formatUnknown(value: unknown) {
  return inspect(value, {
    depth: null,
    colors: false,
    compact: false,
    sorted: true,
  });
}

function resolveHumanLines<T>(data: T, human?: HumanLines<T>) {
  if (!human) {
    return [formatUnknown(data)];
  }

  return typeof human === "function" ? human(data) : human;
}

export function createOutputService(context: CliContext): OutputService {
  const pretty = context.pretty ?? false;

  return {
    success<T>(data: T, human?: HumanLines<T>) {
      if (!pretty) {
        printJson({ ok: true, data });
        return;
      }

      process.stdout.write(`${resolveHumanLines(data, human).join("\n")}\n`);
    },
    error(error: unknown, human?: string[]) {
      const resolved = normalizeCliError(error);

      if (!pretty) {
        process.stderr.write(
          `${JSON.stringify(
            {
              ok: false,
              error: {
                code: resolved.code,
                message: resolved.message,
                ...(resolved.hint ? { hint: resolved.hint } : {}),
              },
            } satisfies Output<never>,
            null,
            2
          )}\n`
        );
        return;
      }

      const lines = human ?? [
        `Error Code: ${resolved.code}`,
        `Error: ${resolved.message}`,
        ...(resolved.hint ? [`Hint: ${resolved.hint}`] : []),
      ];
      process.stderr.write(`${lines.join("\n")}\n`);
    },
  };
}
