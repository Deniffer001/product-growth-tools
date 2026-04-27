/**
 * @input runtime context, provider factory, and output service
 * @output lazy service container for backlink handlers
 * @pos runtime composition layer for provider and serializer boundaries
 */

import type { CliContext } from "./context";
import { createOutputService, type OutputService } from "./output";
import { createBacklinkClient, type BacklinkClient } from "./provider";

export type CliServices = {
  context: CliContext;
  output: OutputService;
  getBacklinkClient: () => BacklinkClient;
};

export function createCliServices(context: CliContext): CliServices {
  let backlinkClient: BacklinkClient | null = null;

  return {
    context,
    output: createOutputService(context),
    getBacklinkClient() {
      backlinkClient ??= createBacklinkClient({
        login: context.login,
        password: context.password,
      });
      return backlinkClient;
    },
  };
}
