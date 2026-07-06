/**
 * @input runtime context, provider factory, and output service
 * @output lazy service container for AI Optimization handlers
 * @pos runtime composition layer for provider and serializer boundaries
 */

import { defineClientAdapter } from "@deniffer/cli-kit/client";
import {
  type CliServices as BaseCliServices,
  createCliServices as createBaseCliServices,
} from "@deniffer/cli-kit/services";

import type { CliContext } from "./context";
import { aiOptimizationErrorMapper } from "./lib/errors";
import {
  createAiOptimizationClient,
  type AiOptimizationClient,
} from "./provider";

const aiOptimizationAdapter = defineClientAdapter<
  AiOptimizationClient,
  CliContext
>((context) =>
  createAiOptimizationClient({
    login: context.login,
    password: context.password,
    defaultLocationCode: context.defaultLocationCode,
    defaultLanguageCode: context.defaultLanguageCode,
  })
);

export type CliServices = BaseCliServices<AiOptimizationClient, CliContext> & {
  getAiOptimizationClient: () => AiOptimizationClient;
};

export function createCliServices(context: CliContext): CliServices {
  const base = createBaseCliServices({
    context,
    adapter: aiOptimizationAdapter,
    errorMappers: [aiOptimizationErrorMapper],
  });

  return { ...base, getAiOptimizationClient: base.getClient };
}
