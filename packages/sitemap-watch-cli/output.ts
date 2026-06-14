/**
 * @input CLI output mode plus success or error payloads
 * @output agent-first JSON output (built on @deniffer/cli-kit)
 * @pos serialization boundary between sitemap-watch handlers and terminal
 */

import {
  createOutputService as createBaseOutputService,
  type HumanLines,
  type Output,
  type OutputService,
} from "@deniffer/cli-kit/output";

import type { CliContext } from "./context";
import { normalizeCliError, sitemapErrorMapper } from "./lib/errors";

export type { HumanLines, Output, OutputService };

export function createOutputService(context: CliContext): OutputService {
  const base = createBaseOutputService({
    pretty: context.pretty,
    errorMappers: [sitemapErrorMapper],
  });

  const pretty = context.pretty ?? false;

  return {
    success: base.success,
    error(error: unknown, human?: string[]) {
      // Preserve sitemap-watch's pretty error contract ("Error Code:" / "Error:")
      // while keeping JSON mode, normalization, and the hint line on cli-kit.
      if (pretty && !human) {
        const resolved = normalizeCliError(error);
        base.error(error, [
          `Error Code: ${resolved.code}`,
          `Error: ${resolved.message}`,
        ]);
        return;
      }

      base.error(error, human);
    },
  };
}
