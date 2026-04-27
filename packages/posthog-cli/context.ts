/**
 * @input CLI global flags, product-growth profiles, and process env vars
 * @output typed runtime context for PostHog provider reads
 * @pos lightweight runtime context boundary for posthog CLI
 */

import { config } from "dotenv";
import {
  getActiveProfileMetadata,
  loadProductGrowthEnv,
  type ProductGrowthProfileMetadata,
} from "./lib/product-growth-runtime/profile";

export type CliContext = {
  apiToken?: string;
  apiBaseUrl: string;
  projectId?: string;
  pretty?: boolean;
  profile: ProductGrowthProfileMetadata;
};

type EnvLoader = (input: {
  path: string;
  override?: boolean;
  quiet?: boolean;
}) => unknown;

export function loadDefaultCliEnv(loadEnv: EnvLoader = config) {
  loadProductGrowthEnv(loadEnv);
}

export function shouldLoadDefaultCliEnv(input: {
  flags: Record<string, unknown>;
}) {
  if (input.flags.help === true) {
    return false;
  }
  if (input.flags.schema === true || typeof input.flags.schema === "string") {
    return false;
  }
  return true;
}

export function createCliContext(input: {
  posthogApiToken?: string;
  posthogHost?: string;
  posthogProjectId?: string;
  pretty?: boolean;
}): CliContext {
  return {
    apiToken:
      input.posthogApiToken ??
      process.env.POSTHOG_API_TOKEN ??
      process.env.POSTHOG_PERSONAL_API_KEY ??
      process.env.POSTHOG_CLI_API_KEY,
    apiBaseUrl:
      input.posthogHost ??
      process.env.POSTHOG_HOST ??
      process.env.POSTHOG_API_BASE_URL ??
      process.env.POSTHOG_CLI_HOST ??
      "https://us.posthog.com",
    projectId:
      input.posthogProjectId ??
      process.env.POSTHOG_PROJECT_ID ??
      process.env.POSTHOG_ENV_ID ??
      process.env.POSTHOG_CLI_PROJECT_ID,
    pretty: input.pretty ?? false,
    profile: getActiveProfileMetadata(),
  };
}
