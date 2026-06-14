/**
 * @input CLI output mode plus success or error payloads
 * @output agent-first JSON output (built on @deniffer/cli-kit)
 * @pos serialization boundary between PostHog handlers and terminal
 */

import {
  createOutputService as createBaseOutputService,
  type HumanLines,
  type Output,
  type OutputService,
} from "@deniffer/cli-kit/output";

import type { CliContext } from "./context";
import { posthogErrorMapper } from "./lib/errors";

export type { HumanLines, Output, OutputService };

export function createOutputService(context: CliContext): OutputService {
  return createBaseOutputService({
    pretty: context.pretty,
    errorMappers: [posthogErrorMapper],
  });
}
