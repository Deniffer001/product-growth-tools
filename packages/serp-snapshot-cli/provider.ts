/**
 * @input DataForSEO Google Organic SERP API responses
 * @output normalized SERP snapshots for SEO and GEO workflows
 * @pos provider adapter that keeps SERP vendor payloads behind a stable contract
 */

import { cliError } from "./lib/errors";
import type { SerpDevice, SerpOs } from "./lib/input-validation";

export type SerpFeatureState = boolean | "present" | "unknown";

export type SerpSnapshotResult = {
  rank: number | null;
  type: string;
  title: string | null;
  url: string | null;
  domain: string | null;
  snippet: string | null;
  displayedUrl: string | null;
  resultClass: "competitor" | "directory" | "forum" | "publisher" | "owned" | "unknown";
};

export type SerpSnapshot = {
  query: string;
  engine: "google";
  country: string;
  language: string;
  device: SerpDevice;
  os: SerpOs;
  depth: number;
  capturedAt: string;
  provider: "dataforseo";
  checkUrl: string | null;
  features: {
    ads: SerpFeatureState;
    featuredSnippet: SerpFeatureState;
    peopleAlsoAsk: SerpFeatureState;
    localPack: SerpFeatureState;
    video: SerpFeatureState;
    images: SerpFeatureState;
    aiOverview: SerpFeatureState;
  };
  resultCount: number;
  results: SerpSnapshotResult[];
  raw: {
    providerTaskId: string | null;
    providerStatusCode?: number;
  };
};

export type SerpQueryRequest = {
  query: string;
  country: string;
  language: string;
  device: SerpDevice;
  os: SerpOs;
  depth: number;
};

export type SerpSnapshotClient = {
  checkReadiness: () => Promise<{
    provider: "dataforseo";
    ready: boolean;
    hasLogin: boolean;
    hasPassword: boolean;
  }>;
  query: (input: SerpQueryRequest) => Promise<SerpSnapshot>;
};

type FetchLike = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }
) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;

type DataForSeoTask = {
  id?: string;
  status_code?: number;
  status_message?: string;
  result?: Array<{
    keyword?: string;
    check_url?: string;
    items?: unknown[];
  }>;
};

type DataForSeoResponse = {
  status_code?: number;
  status_message?: string;
  tasks?: DataForSeoTask[];
};

const DATAFORSEO_ENDPOINT =
  "https://api.dataforseo.com/v3/serp/google/organic/live/advanced";
const LOCATION_CODES: Record<string, number> = {
  AU: 2036,
  CA: 2124,
  CN: 2156,
  DE: 2276,
  FR: 2250,
  GB: 2826,
  JP: 2392,
  SG: 2702,
  US: 2840,
};

export function createSerpSnapshotClient(input: {
  login?: string;
  password?: string;
  fetcher?: FetchLike;
}): SerpSnapshotClient {
  const fetcher = input.fetcher ?? fetch;

  return {
    async checkReadiness() {
      return {
        provider: "dataforseo",
        ready: Boolean(input.login && input.password),
        hasLogin: Boolean(input.login),
        hasPassword: Boolean(input.password),
      };
    },
    async query(request) {
      requireCredentials(input);
      const response = await fetcher(DATAFORSEO_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${input.login}:${input.password}`
          ).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          {
            keyword: request.query,
            ...buildLocationInput(request.country),
            language_code: request.language,
            device: request.device,
            os: request.os,
            depth: request.depth,
          },
        ]),
      });

      if (!response.ok) {
        throw providerHttpError(response.status);
      }

      const parsed = parseProviderResponse(await response.text());
      assertProviderAccepted(parsed);
      const task = parsed.tasks?.[0];
      if (!task) {
        throw cliError({
          code: "provider_error",
          message: "DataForSEO response did not include a task.",
        });
      }

      if (task.status_code && task.status_code >= 40000) {
        throw cliError({
          code: "provider_error",
          message:
            task.status_message ??
            `DataForSEO task failed with status ${task.status_code}.`,
        });
      }

      return normalizeDataForSeoSnapshot(request, task);
    },
  };
}

function buildLocationInput(country: string) {
  const locationCode = LOCATION_CODES[country.toUpperCase()];
  if (locationCode) {
    return { location_code: locationCode };
  }

  return { location_name: country };
}

function requireCredentials(input: { login?: string; password?: string }) {
  if (input.login && input.password) {
    return;
  }

  throw cliError({
    code: "auth_error",
    message: "Missing DataForSEO credentials.",
    hint: "Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD in the active product-growth profile or invocation env.",
  });
}

function providerHttpError(status: number) {
  const error = new Error(`DataForSEO request failed with HTTP ${status}.`);
  Reflect.set(error, "status", status);
  return error;
}

function parseProviderResponse(text: string): DataForSeoResponse {
  try {
    return JSON.parse(text) as DataForSeoResponse;
  } catch {
    throw cliError({
      code: "parse_error",
      message: "DataForSEO returned invalid JSON.",
      hint: text.slice(0, 200),
    });
  }
}

function assertProviderAccepted(parsed: DataForSeoResponse) {
  if (parsed.status_code && parsed.status_code >= 40000) {
    throw cliError({
      code: "provider_error",
      message:
        parsed.status_message ??
        `DataForSEO request failed with status ${parsed.status_code}.`,
    });
  }
}

function normalizeDataForSeoSnapshot(
  request: SerpQueryRequest,
  task: DataForSeoTask
): SerpSnapshot {
  const result = task.result?.[0];
  const items = Array.isArray(result?.items) ? result.items : [];
  const results = items.flatMap(normalizeItem);

  return {
    query: result?.keyword ?? request.query,
    engine: "google",
    country: request.country,
    language: request.language,
    device: request.device,
    os: request.os,
    depth: request.depth,
    capturedAt: new Date().toISOString(),
    provider: "dataforseo",
    checkUrl: normalizeString(result?.check_url),
    features: detectFeatures(items),
    resultCount: results.length,
    results,
    raw: {
      providerTaskId: task.id ?? null,
      providerStatusCode: task.status_code,
    },
  };
}

function normalizeItem(item: unknown): SerpSnapshotResult[] {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return [];
  }

  const type = normalizeString(Reflect.get(item, "type")) ?? "unknown";
  if (type === "people_also_ask" || type === "related_searches") {
    return [];
  }

  const url = normalizeString(
    Reflect.get(item, "url") ?? Reflect.get(item, "link")
  );
  const domain = normalizeDomain(
    normalizeString(Reflect.get(item, "domain")),
    url
  );

  return [
    {
      rank: normalizeNumber(
        Reflect.get(item, "rank_group") ?? Reflect.get(item, "rank_absolute")
      ),
      type,
      title: normalizeString(Reflect.get(item, "title")),
      url,
      domain,
      snippet: normalizeString(
        Reflect.get(item, "description") ?? Reflect.get(item, "snippet")
      ),
      displayedUrl: normalizeString(
        Reflect.get(item, "breadcrumb") ?? Reflect.get(item, "displayed_url")
      ),
      resultClass: classifyResult(domain),
    },
  ];
}

function detectFeatures(items: unknown[]) {
  const types = new Set(
    items.flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return [];
      }
      const type = Reflect.get(item, "type");
      return typeof type === "string" ? [type] : [];
    })
  );

  return {
    ads: feature(types, ["paid", "ads", "google_ads"]),
    featuredSnippet: feature(types, ["featured_snippet"]),
    peopleAlsoAsk: feature(types, ["people_also_ask"]),
    localPack: feature(types, ["local_pack", "maps_search"]),
    video: feature(types, ["video", "video_carousel"]),
    images: feature(types, ["images", "image_pack"]),
    aiOverview: aiOverviewFeature(types),
  };
}

function feature(types: Set<string>, names: string[]): SerpFeatureState {
  return names.some((name) => types.has(name)) ? true : false;
}

function aiOverviewFeature(types: Set<string>): SerpFeatureState {
  return ["ai_overview", "generative_ai", "sge"].some((name) =>
    types.has(name)
  )
    ? "present"
    : "unknown";
}

function classifyResult(domain: string | null): SerpSnapshotResult["resultClass"] {
  if (!domain) {
    return "unknown";
  }

  const normalized = domain.replace(/^www\./, "");
  if (
    normalized.includes("reddit.com") ||
    normalized.includes("quora.com") ||
    normalized.includes("news.ycombinator.com")
  ) {
    return "forum";
  }
  if (
    normalized.includes("alternativeto.net") ||
    normalized.includes("producthunt.com") ||
    normalized.includes("g2.com") ||
    normalized.includes("capterra.com")
  ) {
    return "directory";
  }
  if (
    normalized.includes("medium.com") ||
    normalized.includes("substack.com") ||
    normalized.includes("techcrunch.com")
  ) {
    return "publisher";
  }

  return "unknown";
}

function normalizeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeDomain(domain: string | null, url: string | null) {
  if (domain) {
    return domain;
  }
  if (!url) {
    return null;
  }
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
