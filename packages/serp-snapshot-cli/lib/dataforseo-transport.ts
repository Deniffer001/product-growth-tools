/**
 * @input DataForSEO credentials and optional fetch implementation
 * @output authenticated DataForSEO SDK API clients
 * @pos SDK transport boundary for provider adapters
 */

import {
  SerpApi,
  SerpGoogleOrganicLiveAdvancedRequestInfo,
} from "dataforseo-client";

const DATAFORSEO_BASE_URL = "https://api.dataforseo.com";

export type DataForSeoFetch = (
  url: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1]
) => ReturnType<typeof fetch>;

export type DataForSeoSerpTransport = {
  googleOrganicLiveAdvanced: (
    body: Record<string, unknown>
  ) => Promise<unknown>;
};

export function createAuthenticatedDataForSeoFetch(input: {
  login: string;
  password: string;
  fetcher?: DataForSeoFetch;
}): DataForSeoFetch {
  const fetcher = input.fetcher ?? fetch;
  const token = Buffer.from(`${input.login}:${input.password}`).toString(
    "base64"
  );

  return (url, init) => {
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Basic ${token}`);

    return fetcher(url, {
      ...init,
      headers,
    });
  };
}

export function createDataForSeoSerpTransport(input: {
  login: string;
  password: string;
  fetcher?: DataForSeoFetch;
}): DataForSeoSerpTransport {
  const api = new SerpApi(DATAFORSEO_BASE_URL, {
    fetch: createAuthenticatedDataForSeoFetch(input),
  });

  return {
    googleOrganicLiveAdvanced(body) {
      return api.googleOrganicLiveAdvanced([
        new SerpGoogleOrganicLiveAdvancedRequestInfo(body),
      ]);
    },
  };
}
