/**
 * @input runtime context, provider factory, and output service
 * @output lazy service container for backlink handlers (built on @deniffer/cli-kit)
 * @pos runtime composition layer for provider and serializer boundaries
 */

import { defineClientAdapter } from "@deniffer/cli-kit/client";
import { type CliServices as BaseCliServices, createCliServices as createBaseCliServices } from "@deniffer/cli-kit/services";

import type { CliContext } from "./context";
import { backlinkErrorMapper } from "./lib/errors";
import { type BacklinkClient, createBacklinkClient } from "./provider";

const backlinkAdapter = defineClientAdapter<BacklinkClient, CliContext>((context) =>
  createBacklinkClient({ login: context.login, password: context.password }),
);

export type CliServices = BaseCliServices<BacklinkClient, CliContext> & {
  getBacklinkClient: () => BacklinkClient;
};

export function createCliServices(context: CliContext): CliServices {
  const base = createBaseCliServices({
    context,
    adapter: backlinkAdapter,
    errorMappers: [backlinkErrorMapper],
  });

  return { ...base, getBacklinkClient: base.getClient };
}
