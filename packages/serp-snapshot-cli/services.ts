/**
 * @input runtime context, provider factory, and output service
 * @output lazy service container for serp-snapshot handlers
 * @pos runtime composition layer for provider and serializer boundaries
 */

import type { CliContext } from "./context";
import { createOutputService, type OutputService } from "./output";
import {
  createSerpSnapshotClient,
  type SerpSnapshotClient,
} from "./provider";

export type CliServices = {
  context: CliContext;
  output: OutputService;
  getSerpSnapshotClient: () => SerpSnapshotClient;
};

export function createCliServices(context: CliContext): CliServices {
  let serpSnapshotClient: SerpSnapshotClient | null = null;

  return {
    context,
    output: createOutputService(context),
    getSerpSnapshotClient() {
      serpSnapshotClient ??= createSerpSnapshotClient({
        login: context.login,
        password: context.password,
      });
      return serpSnapshotClient;
    },
  };
}
