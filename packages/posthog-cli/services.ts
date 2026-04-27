/**
 * @input runtime context, official PostHog toolkit adapter, and output service
 * @output lazy service container for posthog CLI handlers
 * @pos runtime composition layer for PostHog provider reads and serializer boundaries
 */

import type { CliContext } from "./context";
import { createOutputService, type OutputService } from "./output";
import { createPostHogClient, type PostHogClient } from "./provider";

export type CliServices = {
  context: CliContext;
  output: OutputService;
  getPostHogClient: () => PostHogClient;
};

export function createCliServices(context: CliContext): CliServices {
  let posthogClient: PostHogClient | null = null;

  return {
    context,
    output: createOutputService(context),
    getPostHogClient() {
      posthogClient ??= createPostHogClient({
        apiToken: context.apiToken,
        apiBaseUrl: context.apiBaseUrl,
        projectId: context.projectId,
      });
      return posthogClient;
    },
  };
}
