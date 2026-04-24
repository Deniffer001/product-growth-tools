/**
 * @input CLI global flags, profile env files, and process env vars
 * @output typed runtime context for SERP provider decisions
 * @pos lightweight runtime context boundary for serp-snapshot CLI
 */

import { config } from "dotenv";
import {
  getActiveProfileMetadata,
  loadProductGrowthEnv,
  type ProductGrowthProfileMetadata,
} from "./lib/product-growth-runtime/profile";

export type SerpProvider = "dataforseo";

export type CliContext = {
  provider: SerpProvider;
  login?: string;
  password?: string;
  defaultEngine: "google";
  defaultCountry?: string;
  defaultLanguage?: string;
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
  provider?: string;
  dataforseoLogin?: string;
  dataforseoPassword?: string;
  country?: string;
  language?: string;
  pretty?: boolean;
}): CliContext {
  return {
    provider: resolveProvider(input.provider),
    login: input.dataforseoLogin ?? process.env.DATAFORSEO_LOGIN,
    password: input.dataforseoPassword ?? process.env.DATAFORSEO_PASSWORD,
    defaultEngine: "google",
    defaultCountry: input.country ?? process.env.SERP_DEFAULT_COUNTRY,
    defaultLanguage: input.language ?? process.env.SERP_DEFAULT_LANGUAGE,
    pretty: input.pretty ?? false,
    profile: getActiveProfileMetadata(),
  };
}

function resolveProvider(value?: string): SerpProvider {
  const provider = value ?? process.env.SERP_PROVIDER ?? "dataforseo";
  if (provider === "dataforseo") {
    return provider;
  }

  throw new Error(`Unsupported SERP provider: ${provider}`);
}
