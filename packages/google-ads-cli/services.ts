/**
 * @input runtime context, Google Ads client factory, and output service
 * @output lazy service container for Google Ads handlers (built on @deniffer/cli-kit)
 * @pos runtime composition layer for provider and serializer boundaries
 */

import { defineClientAdapter } from "@deniffer/cli-kit/client";
import { type CliServices as BaseCliServices, createCliServices as createBaseCliServices } from "@deniffer/cli-kit/services";

import { type CliContext, createGoogleAdsClient, type GoogleAdsClient } from "./client";
import { googleAdsErrorMapper } from "./lib/errors";

const googleAdsAdapter = defineClientAdapter<GoogleAdsClient, CliContext>((context) =>
  createGoogleAdsClient(context),
);

export type CliServices = BaseCliServices<GoogleAdsClient, CliContext> & {
  getGoogleAdsClient: () => GoogleAdsClient;
};

export function createCliServices(context: CliContext): CliServices {
  const base = createBaseCliServices({
    context,
    adapter: googleAdsAdapter,
    errorMappers: [googleAdsErrorMapper],
  });

  return { ...base, getGoogleAdsClient: base.getClient };
}
