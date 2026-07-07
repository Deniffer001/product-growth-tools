/**
 * @input runtime context, Bing Webmaster client factory, and output service
 * @output lazy service container for handlers
 * @pos runtime composition layer for provider and serializer boundaries
 */

import { defineClientAdapter } from "@deniffer/cli-kit/client";
import {
  type CliServices as BaseCliServices,
  createCliServices as createBaseCliServices,
} from "@deniffer/cli-kit/services";

import {
  createBingWebmasterClient,
  type BingWebmasterClient,
} from "./client";
import type { CliContext } from "./context";
import { bingWebmasterErrorMapper } from "./lib/errors";

const bingWebmasterAdapter = defineClientAdapter<
  BingWebmasterClient,
  CliContext
>((context) => createBingWebmasterClient(context));

export type CliServices = BaseCliServices<BingWebmasterClient, CliContext> & {
  getBingWebmasterClient: () => BingWebmasterClient;
};

export function createCliServices(context: CliContext): CliServices {
  const base = createBaseCliServices({
    context,
    adapter: bingWebmasterAdapter,
    errorMappers: [bingWebmasterErrorMapper],
  });

  return { ...base, getBingWebmasterClient: base.getClient };
}
