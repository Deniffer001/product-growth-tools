/**
 * @input runtime context, provider factory, and output service
 * @output lazy service container for page-extract handlers (built on @deniffer/cli-kit)
 * @pos runtime composition layer for provider and serializer boundaries
 */

import { defineClientAdapter } from "@deniffer/cli-kit/client";
import { type CliServices as BaseCliServices, createCliServices as createBaseCliServices } from "@deniffer/cli-kit/services";

import type { CliContext } from "./context";
import { pageExtractErrorMapper } from "./lib/errors";
import { type PageExtractClient, createPageExtractClient } from "./provider";

const pageExtractAdapter = defineClientAdapter<PageExtractClient, CliContext>((context) =>
  createPageExtractClient({ ctxBin: context.ctxBin }),
);

export type CliServices = BaseCliServices<PageExtractClient, CliContext> & {
  getPageExtractClient: () => PageExtractClient;
};

export function createCliServices(context: CliContext): CliServices {
  const base = createBaseCliServices({
    context,
    adapter: pageExtractAdapter,
    errorMappers: [pageExtractErrorMapper],
  });

  return { ...base, getPageExtractClient: base.getClient };
}
