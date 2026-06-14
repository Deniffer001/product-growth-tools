/**
 * @input CLI output mode plus success or error payloads
 * @output agent-first JSON output (built on @deniffer/cli-kit)
 * @pos serialization boundary between Google Ads handlers and terminal
 */

import {
  createOutputService as createBaseOutputService,
  type HumanLines,
  type Output,
  type OutputService,
} from "@deniffer/cli-kit/output";

import { googleAdsErrorMapper, normalizeCliError } from "./lib/errors";

export type { HumanLines, Output, OutputService };

export function createOutputService(context: { pretty?: boolean }): OutputService {
  const pretty = context.pretty ?? false;
  const base = createBaseOutputService({
    pretty,
    errorMappers: [googleAdsErrorMapper],
  });

  return {
    success: base.success,
    error(error: unknown, human?: string[]) {
      // JSON mode + normalization are delegated to cli-kit; only the pretty
      // error rendering preserves this CLI's pinned "Error Code:" layout.
      if (!pretty) {
        base.error(error, human);
        return;
      }

      const resolved = normalizeCliError(error);
      const lines = human ?? [
        `Error Code: ${resolved.code}`,
        `Error: ${resolved.message}`,
        ...(resolved.hint ? [`Hint: ${resolved.hint}`] : []),
      ];
      process.stderr.write(`${lines.join("\n")}\n`);
    },
  };
}
