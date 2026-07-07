/**
 * @input resolved Bing Webmaster context, request method names, and optional fetch implementation
 * @output read-only Bing Webmaster JSON/HTTP client
 * @pos provider transport boundary for Bing Webmaster CLI handlers
 */

import type { CliContext } from "./context";
import { BingWebmasterProviderError, cliError } from "./lib/errors";
import { validateApiKey } from "./lib/input-validation";

const BING_WEBMASTER_JSON_BASE_URL =
  "https://ssl.bing.com/webmaster/api.svc/json";

export type BingWebmasterFetch = (
  url: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1]
) => ReturnType<typeof fetch>;

export type BingWebmasterClient = {
  getUserSites: () => Promise<unknown>;
  getRankAndTrafficStats: (input: { siteUrl: string }) => Promise<unknown>;
  getQueryStats: (input: { siteUrl: string }) => Promise<unknown>;
  getPageStats: (input: { siteUrl: string }) => Promise<unknown>;
  getQueryTrafficStats: (input: {
    siteUrl: string;
    query: string;
  }) => Promise<unknown>;
  getPageQueryStats: (input: {
    siteUrl: string;
    page: string;
  }) => Promise<unknown>;
  getQueryPageStats: (input: {
    siteUrl: string;
    query: string;
  }) => Promise<unknown>;
  getQueryPageDetailStats: (input: {
    siteUrl: string;
    query: string;
    page: string;
  }) => Promise<unknown>;
  getCrawlStats: (input: { siteUrl: string }) => Promise<unknown>;
  getCrawlIssues: (input: { siteUrl: string }) => Promise<unknown>;
  getCrawlSettings: (input: { siteUrl: string }) => Promise<unknown>;
  getLinkCounts: (input: { siteUrl: string; page: number }) => Promise<unknown>;
  getUrlLinks: (input: {
    siteUrl: string;
    link: string;
    page: number;
  }) => Promise<unknown>;
  getFeeds: (input: { siteUrl: string }) => Promise<unknown>;
  getFeedDetails: (input: {
    siteUrl: string;
    feedUrl: string;
  }) => Promise<unknown>;
  getUrlInfo: (input: { siteUrl: string; url: string }) => Promise<unknown>;
  getUrlTrafficInfo: (input: {
    siteUrl: string;
    url: string;
  }) => Promise<unknown>;
};

type QueryParamValue = string | number | boolean;

type QueryParam = {
  value: QueryParamValue;
  encodeAsJsonString?: boolean;
};

type RequestParams = Record<string, QueryParamValue | QueryParam | undefined>;

export function createBingWebmasterClient(context: CliContext): BingWebmasterClient {
  return createBingWebmasterClientFromApiKey({
    apiKey: context.apiKey,
  });
}

export function createBingWebmasterClientFromApiKey(input: {
  apiKey?: string;
  fetcher?: BingWebmasterFetch;
  baseUrl?: string;
}): BingWebmasterClient {
  const apiKey = validateApiKey(input.apiKey);
  const fetcher = input.fetcher ?? fetch;
  const baseUrl = input.baseUrl ?? BING_WEBMASTER_JSON_BASE_URL;

  function get(method: string, params: RequestParams = {}) {
    return fetchBingJson({
      apiKey,
      baseUrl,
      fetcher,
      method,
      params,
    });
  }

  return {
    getUserSites() {
      return get("GetUserSites");
    },
    getRankAndTrafficStats(input) {
      return get("GetRankAndTrafficStats", { siteUrl: input.siteUrl });
    },
    getQueryStats(input) {
      return get("GetQueryStats", { siteUrl: input.siteUrl });
    },
    getPageStats(input) {
      return get("GetPageStats", { siteUrl: input.siteUrl });
    },
    getQueryTrafficStats(input) {
      return get("GetQueryTrafficStats", {
        siteUrl: input.siteUrl,
        query: jsonString(input.query),
      });
    },
    getPageQueryStats(input) {
      return get("GetPageQueryStats", {
        siteUrl: input.siteUrl,
        page: jsonString(input.page),
      });
    },
    getQueryPageStats(input) {
      return get("GetQueryPageStats", {
        siteUrl: input.siteUrl,
        query: jsonString(input.query),
      });
    },
    getQueryPageDetailStats(input) {
      return get("GetQueryPageDetailStats", {
        siteUrl: input.siteUrl,
        query: jsonString(input.query),
        page: jsonString(input.page),
      });
    },
    getCrawlStats(input) {
      return get("GetCrawlStats", { siteUrl: input.siteUrl });
    },
    getCrawlIssues(input) {
      return get("GetCrawlIssues", { siteUrl: input.siteUrl });
    },
    getCrawlSettings(input) {
      return get("GetCrawlSettings", { siteUrl: input.siteUrl });
    },
    getLinkCounts(input) {
      return get("GetLinkCounts", {
        siteUrl: input.siteUrl,
        page: input.page,
      });
    },
    getUrlLinks(input) {
      return get("GetUrlLinks", {
        siteUrl: input.siteUrl,
        link: jsonString(input.link),
        page: input.page,
      });
    },
    getFeeds(input) {
      return get("GetFeeds", { siteUrl: input.siteUrl });
    },
    getFeedDetails(input) {
      return get("GetFeedDetails", {
        siteUrl: input.siteUrl,
        feedUrl: jsonString(input.feedUrl),
      });
    },
    getUrlInfo(input) {
      return get("GetUrlInfo", {
        siteUrl: input.siteUrl,
        url: jsonString(input.url),
      });
    },
    getUrlTrafficInfo(input) {
      return get("GetUrlTrafficInfo", {
        siteUrl: input.siteUrl,
        url: jsonString(input.url),
      });
    },
  };
}

function jsonString(value: string): QueryParam {
  return { value, encodeAsJsonString: true };
}

async function fetchBingJson(input: {
  apiKey: string;
  baseUrl: string;
  fetcher: BingWebmasterFetch;
  method: string;
  params: RequestParams;
}) {
  const url = buildBingWebmasterUrl(input);
  const response = await input.fetcher(url, {
    headers: {
      Accept: "application/json",
    },
  });
  const text = await response.text();
  const body = parseJsonResponse(text);

  if (!response.ok) {
    throw createProviderError(response.status, body, text);
  }

  return unwrapBingPayload(body);
}

export function buildBingWebmasterUrl(input: {
  apiKey: string;
  baseUrl?: string;
  method: string;
  params?: RequestParams;
}) {
  const baseUrl = input.baseUrl ?? BING_WEBMASTER_JSON_BASE_URL;
  const url = new URL(`${baseUrl}/${input.method}`);
  url.searchParams.set("apikey", input.apiKey);

  for (const [key, value] of Object.entries(input.params ?? {})) {
    if (value === undefined) {
      continue;
    }

    if (typeof value === "object") {
      url.searchParams.set(
        key,
        value.encodeAsJsonString ? JSON.stringify(value.value) : String(value.value)
      );
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url;
}

function parseJsonResponse(text: string) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw cliError({
      code: "provider_failure",
      message: "Bing Webmaster returned invalid JSON.",
      hint: "Retry later; the provider response could not be parsed.",
    });
  }
}

function unwrapBingPayload(body: unknown) {
  if (body && typeof body === "object" && "d" in body) {
    return (body as { d: unknown }).d;
  }

  return body;
}

function createProviderError(status: number, body: unknown, text: string) {
  const errorBody =
    body && typeof body === "object"
      ? (body as { ErrorCode?: unknown; Message?: unknown })
      : {};
  const providerCode =
    typeof errorBody.ErrorCode === "number" ? errorBody.ErrorCode : undefined;
  const providerMessage =
    typeof errorBody.Message === "string" ? errorBody.Message : undefined;
  const message =
    providerMessage ??
    (text ? `Bing Webmaster request failed: ${text}` : "Bing Webmaster request failed.");

  return new BingWebmasterProviderError(message, {
    status,
    providerCode,
    providerMessage,
  });
}
