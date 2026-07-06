/**
 * @input DataForSEO credentials and optional fetch implementation
 * @output authenticated DataForSEO SDK API clients
 * @pos SDK transport boundary for provider adapters
 */

import {
  BacklinksAnchorsLiveRequestInfo,
  BacklinksApi,
  BacklinksBacklinksLiveRequestInfo,
  BacklinksReferringDomainsLiveRequestInfo,
  BacklinksSummaryLiveRequestInfo,
} from "dataforseo-client";

const DATAFORSEO_BASE_URL = "https://api.dataforseo.com";

export type DataForSeoFetch = (
  url: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1]
) => ReturnType<typeof fetch>;

export type DataForSeoBacklinkDatasetKind =
  | "summary"
  | "backlinks"
  | "referring_domains"
  | "anchors";

export type DataForSeoBacklinksTransport = {
  request: (
    dataset: DataForSeoBacklinkDatasetKind,
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

export function createDataForSeoBacklinksTransport(input: {
  login: string;
  password: string;
  fetcher?: DataForSeoFetch;
}): DataForSeoBacklinksTransport {
  const api = new BacklinksApi(DATAFORSEO_BASE_URL, {
    fetch: createAuthenticatedDataForSeoFetch(input),
  });

  return {
    async request(dataset, body) {
      if (dataset === "summary") {
        return api.summaryLive([new BacklinksSummaryLiveRequestInfo(body)]);
      }
      if (dataset === "backlinks") {
        return api.backlinksLive([new BacklinksBacklinksLiveRequestInfo(body)]);
      }
      if (dataset === "referring_domains") {
        return api.referringDomainsLive([
          new BacklinksReferringDomainsLiveRequestInfo(body),
        ]);
      }

      return api.anchorsLive([new BacklinksAnchorsLiveRequestInfo(body)]);
    },
  };
}
