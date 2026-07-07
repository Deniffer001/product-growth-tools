/**
 * @input CLI global flags, profile env files, and process env vars
 * @output typed runtime context for Bing Webmaster provider reads
 * @pos lightweight runtime context boundary for Bing Webmaster CLI
 */

import { config } from "dotenv";
import {
  getActiveProfileMetadata,
  loadProductGrowthEnv,
  type ProductGrowthProfileMetadata,
} from "./lib/product-growth-runtime/profile";

export type CliContext = {
  apiKey?: string;
  siteUrl?: string;
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
  apiKey?: string;
  siteUrl?: string;
  pretty?: boolean;
}): CliContext {
  return {
    apiKey: input.apiKey ?? process.env.BING_WEBMASTER_API_KEY,
    siteUrl: input.siteUrl ?? process.env.BING_WEBMASTER_SITE_URL,
    pretty: input.pretty ?? false,
    profile: getActiveProfileMetadata(),
  };
}
