/**
 * @input runtime context, provider factory, and output service
 * @output lazy service container for serp-snapshot handlers (built on @deniffer/cli-kit)
 * @pos runtime composition layer for provider and serializer boundaries
 */

import { defineClientAdapter } from "@deniffer/cli-kit/client";
import { type CliServices as BaseCliServices, createCliServices as createBaseCliServices } from "@deniffer/cli-kit/services";

import type { CliContext } from "./context";
import { serpSnapshotErrorMapper } from "./lib/errors";
import { createSerpSnapshotClient, type SerpSnapshotClient } from "./provider";

const serpSnapshotAdapter = defineClientAdapter<SerpSnapshotClient, CliContext>((context) =>
  createSerpSnapshotClient({ login: context.login, password: context.password }),
);

export type CliServices = BaseCliServices<SerpSnapshotClient, CliContext> & {
  getSerpSnapshotClient: () => SerpSnapshotClient;
};

export function createCliServices(context: CliContext): CliServices {
  const base = createBaseCliServices({
    context,
    adapter: serpSnapshotAdapter,
    errorMappers: [serpSnapshotErrorMapper],
  });

  return { ...base, getSerpSnapshotClient: base.getClient };
}
