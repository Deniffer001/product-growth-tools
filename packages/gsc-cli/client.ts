/**
 * @input CLI flags, repo env files, process env vars, and Google credentials
 * @output default env loader plus typed GSC client factory
 * @pos Google Search Console auth and provider boundary for CLI handlers
 */

import { existsSync, readFileSync } from "node:fs";
import {
  getActiveProfileMetadata,
  loadProductGrowthEnv,
  resolveInvocationPath,
  resolveProfilePath,
  type ProductGrowthProfileMetadata,
} from "@deniffer/product-growth-runtime/profile";
import { config } from "dotenv";
import { google, type searchconsole_v1 } from "googleapis";
import { cliError } from "./lib/errors";

export type SearchAnalyticsRow = {
  keys?: string[] | null;
  clicks?: number | null;
  impressions?: number | null;
  ctr?: number | null;
  position?: number | null;
};

export type GscClient = {
  listSites: () => Promise<searchconsole_v1.Schema$SitesListResponse>;
  querySearchAnalytics: (input: {
    siteUrl: string;
    requestBody: searchconsole_v1.Schema$SearchAnalyticsQueryRequest;
  }) => Promise<searchconsole_v1.Schema$SearchAnalyticsQueryResponse>;
  listSitemaps: (input: {
    siteUrl: string;
    sitemapIndex?: string;
  }) => Promise<searchconsole_v1.Schema$SitemapsListResponse>;
  getSitemap: (input: {
    siteUrl: string;
    feedpath: string;
  }) => Promise<searchconsole_v1.Schema$WmxSitemap>;
  inspectUrl: (input: {
    inspectionUrl: string;
    siteUrl: string;
    languageCode?: string;
  }) => Promise<searchconsole_v1.Schema$InspectUrlIndexResponse>;
};

export type CliContext = {
  credentialsFile?: string;
  credentialsJson?: string;
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
  credentialsFile?: string;
  siteUrl?: string;
  pretty?: boolean;
}): CliContext {
  return {
    credentialsFile: resolveCredentialsFile(input.credentialsFile),
    credentialsJson: resolveCredentialsJson(),
    siteUrl: resolveSiteUrl(input.siteUrl),
    pretty: input.pretty ?? false,
    profile: getActiveProfileMetadata(),
  };
}

function resolveSiteUrl(override?: string) {
  return (
    override ??
    process.env.GSC_SITE_URL ??
    process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL
  );
}

function resolveCredentialsFile(override?: string) {
  if (override) {
    return resolveInvocationPath(override);
  }

  const resolved =
    process.env.GSC_CREDENTIALS_FILE ??
    process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!resolved) {
    return resolved;
  }

  return resolveProfilePath(resolved);
}

function resolveCredentialsJson() {
  return process.env.GSC_SERVICE_ACCOUNT_JSON;
}

function parseCredentialsJson(raw: string) {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw cliError({
      code: "invalid_input",
      message: "GSC_SERVICE_ACCOUNT_JSON is not valid JSON.",
      hint: "Store the raw service account JSON string in GSC_SERVICE_ACCOUNT_JSON.",
    });
  }
}

function resolveCredentials(context: CliContext) {
  if (context.credentialsJson) {
    return { credentials: parseCredentialsJson(context.credentialsJson) };
  }

  if (context.credentialsFile) {
    if (!existsSync(context.credentialsFile)) {
      throw cliError({
        code: "invalid_input",
        message: `Credentials file not found: ${context.credentialsFile}`,
        hint: "Pass --credentials-file <path> or set GSC_SERVICE_ACCOUNT_JSON.",
      });
    }
    return { keyFile: context.credentialsFile };
  }

  throw cliError({
    code: "invalid_input",
    message: "Missing Google Search Console credentials.",
    hint: "Set GSC_SERVICE_ACCOUNT_JSON, GOOGLE_APPLICATION_CREDENTIALS, or pass --credentials-file <path>.",
  });
}

function createSearchConsole(context: CliContext) {
  const auth = new google.auth.GoogleAuth({
    ...resolveCredentials(context),
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });

  return google.searchconsole({
    version: "v1",
    auth,
  });
}

export function createGscClient(context: CliContext): GscClient {
  const searchConsole = createSearchConsole(context);

  return {
    listSites() {
      return searchConsole.sites.list().then((response) => response.data);
    },
    querySearchAnalytics(input) {
      return searchConsole.searchanalytics
        .query({
          siteUrl: input.siteUrl,
          requestBody: input.requestBody,
        })
        .then((response) => response.data);
    },
    listSitemaps(input) {
      return searchConsole.sitemaps
        .list({
          siteUrl: input.siteUrl,
          sitemapIndex: input.sitemapIndex,
        })
        .then((response) => response.data);
    },
    getSitemap(input) {
      return searchConsole.sitemaps
        .get({
          siteUrl: input.siteUrl,
          feedpath: input.feedpath,
        })
        .then((response) => response.data);
    },
    inspectUrl(input) {
      return searchConsole.urlInspection.index
        .inspect({
          requestBody: {
            inspectionUrl: input.inspectionUrl,
            siteUrl: input.siteUrl,
            languageCode: input.languageCode,
          },
        })
        .then((response) => response.data);
    },
  };
}

export function readJsonFile(path: string) {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}
