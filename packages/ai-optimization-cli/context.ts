/**
 * @input CLI global flags, profile env files, and process env vars
 * @output typed runtime context for DataForSEO AI Optimization provider decisions
 * @pos lightweight runtime context boundary for AI Optimization CLI
 */

import { config } from "dotenv";
import {
  getActiveProfileMetadata,
  loadProductGrowthEnv,
  type ProductGrowthProfileMetadata,
} from "./lib/product-growth-runtime/profile";

export type CliContext = {
  login?: string;
  password?: string;
  defaultLocationCode?: number;
  defaultLanguageCode?: string;
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
  dataforseoLogin?: string;
  dataforseoPassword?: string;
  locationCode?: string | number;
  languageCode?: string;
  pretty?: boolean;
}): CliContext {
  return {
    login: input.dataforseoLogin ?? process.env.DATAFORSEO_LOGIN,
    password: input.dataforseoPassword ?? process.env.DATAFORSEO_PASSWORD,
    defaultLocationCode: readNumber(
      input.locationCode ?? process.env.AI_OPTIMIZATION_DEFAULT_LOCATION_CODE
    ),
    defaultLanguageCode:
      input.languageCode ?? process.env.AI_OPTIMIZATION_DEFAULT_LANGUAGE_CODE,
    pretty: input.pretty ?? false,
    profile: getActiveProfileMetadata(),
  };
}

function readNumber(value: unknown) {
  if (value === undefined || value === "") {
    return undefined;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
