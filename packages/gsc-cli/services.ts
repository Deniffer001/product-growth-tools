/**
 * @input resolved CLI context, GSC client factory, and output service
 * @output lazy service container for GSC handlers (built on @deniffer/cli-kit)
 * @pos GSC runtime services boundary
 */

import { defineClientAdapter } from "@deniffer/cli-kit/client";
import { type CliServices as BaseCliServices, createCliServices as createBaseCliServices } from "@deniffer/cli-kit/services";

import { type CliContext, createGscClient, type GscClient } from "./client";
import { gscErrorMapper } from "./lib/errors";

const gscAdapter = defineClientAdapter<GscClient, CliContext>((context) =>
  createGscClient(context),
);

export type CliServices = BaseCliServices<GscClient, CliContext> & {
  getGscClient: () => GscClient;
};

export function createCliServices(context: CliContext): CliServices {
  const base = createBaseCliServices({
    context,
    adapter: gscAdapter,
    errorMappers: [gscErrorMapper],
  });

  return { ...base, getGscClient: base.getClient };
}
