/**
 * @input runtime context, official PostHog toolkit adapter, and output service
 * @output lazy service container for posthog CLI handlers (built on @deniffer/cli-kit)
 * @pos runtime composition layer for PostHog provider reads and serializer boundaries
 */

import { defineClientAdapter } from "@deniffer/cli-kit/client";
import { type CliServices as BaseCliServices, createCliServices as createBaseCliServices } from "@deniffer/cli-kit/services";

import type { CliContext } from "./context";
import { posthogErrorMapper } from "./lib/errors";
import { createPostHogClient, type PostHogClient } from "./provider";

const posthogAdapter = defineClientAdapter<PostHogClient, CliContext>((context) =>
  createPostHogClient({
    apiToken: context.apiToken,
    apiBaseUrl: context.apiBaseUrl,
    projectId: context.projectId,
  }),
);

export type CliServices = BaseCliServices<PostHogClient, CliContext> & {
  getPostHogClient: () => PostHogClient;
};

export function createCliServices(context: CliContext): CliServices {
  const base = createBaseCliServices({
    context,
    adapter: posthogAdapter,
    errorMappers: [posthogErrorMapper],
  });

  return { ...base, getPostHogClient: base.getClient };
}
