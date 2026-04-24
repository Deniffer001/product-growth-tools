/**
 * @input runtime context, provider factory, and output service
 * @output lazy service container for page-extract handlers
 * @pos runtime composition layer for provider and serializer boundaries
 */

import type { CliContext } from "./context";
import { createOutputService, type OutputService } from "./output";
import { createPageExtractClient, type PageExtractClient } from "./provider";

export type CliServices = {
  context: CliContext;
  output: OutputService;
  getPageExtractClient: () => PageExtractClient;
};

export function createCliServices(context: CliContext): CliServices {
  let pageExtractClient: PageExtractClient | null = null;

  return {
    context,
    output: createOutputService(context),
    getPageExtractClient() {
      pageExtractClient ??= createPageExtractClient({ ctxBin: context.ctxBin });
      return pageExtractClient;
    },
  };
}
