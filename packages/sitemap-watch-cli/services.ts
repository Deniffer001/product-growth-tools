/**
 * @input runtime context, provider factory, and output service
 * @output lazy service container for sitemap-watch handlers (built on @deniffer/cli-kit)
 * @pos runtime composition layer for provider and serializer boundaries
 */

import { defineClientAdapter } from "@deniffer/cli-kit/client";
import { type CliServices as BaseCliServices, createCliServices as createBaseCliServices } from "@deniffer/cli-kit/services";

import type { CliContext } from "./context";
import { sitemapErrorMapper } from "./lib/errors";
import { type SitemapClient, createSitemapClient } from "./provider";

const sitemapAdapter = defineClientAdapter<SitemapClient, CliContext>(() =>
  createSitemapClient(),
);

export type CliServices = BaseCliServices<SitemapClient, CliContext> & {
  getSitemapClient: () => SitemapClient;
};

export function createCliServices(context: CliContext): CliServices {
  const base = createBaseCliServices({
    context,
    adapter: sitemapAdapter,
    errorMappers: [sitemapErrorMapper],
  });

  return { ...base, getSitemapClient: base.getClient };
}
