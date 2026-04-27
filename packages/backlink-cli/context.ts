/**
 * @input CLI global flags, profile env files, and process env vars
 * @output typed runtime context for DataForSEO backlink provider decisions
 * @pos lightweight runtime context boundary for backlink CLI
 */

import { config } from "dotenv";
import {
  getActiveProfileMetadata,
  loadProductGrowthEnv,
  type ProductGrowthProfileMetadata,
} from "./lib/product-growth-runtime/profile";

export type BacklinkProvider = "dataforseo";

export type CliContext = {
  provider: BacklinkProvider;
  login?: string;
  password?: string;
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
  pretty?: boolean;
}): CliContext {
  return {
    provider: resolveProvider(input.provider),
    login: input.dataforseoLogin ?? process.env.DATAFORSEO_LOGIN,
    password: input.dataforseoPassword ?? process.env.DATAFORSEO_PASSWORD,
    pretty: input.pretty ?? false,
    profile: getActiveProfileMetadata(),
  };
}

function resolveProvider(value?: string): BacklinkProvider {
  const provider = value ?? process.env.BACKLINK_PROVIDER ?? "dataforseo";
  if (provider === "dataforseo") {
    return provider;
  }

  throw new Error(`Unsupported backlink provider: ${provider}`);
}
