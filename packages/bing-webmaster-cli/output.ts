/**
 * @input CLI output mode plus success or error payloads
 * @output agent-first JSON output with optional human-friendly rendering
 * @pos serialization boundary between Bing Webmaster handlers and terminal
 */

import {
  createOutputService as createBaseOutputService,
  type HumanLines,
  type Output,
  type OutputService,
} from "@deniffer/cli-kit/output";

import { bingWebmasterErrorMapper } from "./lib/errors";

export type { HumanLines, Output, OutputService };

export function createOutputService(context: { pretty?: boolean }): OutputService {
  const pretty = context.pretty ?? false;
  return createBaseOutputService({
    pretty,
    errorMappers: [bingWebmasterErrorMapper],
  });
}
