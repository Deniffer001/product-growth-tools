/**
 * @input CLI output mode plus success or error payloads
 * @output agent-first JSON output with optional human-friendly rendering (built on @deniffer/cli-kit)
 * @pos serialization boundary between GSC handlers and terminal
 */

import {
  createOutputService as createBaseOutputService,
  type HumanLines,
  type Output,
  type OutputService,
} from "@deniffer/cli-kit/output";
import { normalizeCliError } from "@deniffer/cli-kit/errors";

import { gscErrorMapper } from "./lib/errors";

export type { HumanLines, Output, OutputService };

export function createOutputService(context: { pretty?: boolean }): OutputService {
  const pretty = context.pretty ?? false;
  const base = createBaseOutputService({ pretty, errorMappers: [gscErrorMapper] });

  return {
    success: base.success,
    error(error: unknown, human?: string[]) {
      // Non-pretty (agent JSON) goes through cli-kit verbatim.
      if (!pretty) {
        base.error(error, human);
        return;
      }

      // GSC pins a "Error Code: …\nError: …" pretty contract that predates
      // cli-kit's single-line format; preserve it while reusing the shared mapper.
      const resolved = normalizeCliError(error, [gscErrorMapper]);
      const lines = human ?? [
        `Error Code: ${resolved.code}`,
        `Error: ${resolved.message}`,
        ...(resolved.hint ? [`Hint: ${resolved.hint}`] : []),
      ];
      process.stderr.write(`${lines.join("\n")}\n`);
    },
  };
}
