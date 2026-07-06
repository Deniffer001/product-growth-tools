/**
 * @input DataForSEO Backlinks API responses
 * @output normalized backlink datasets for SEO and product-growth workflows
 * @pos provider adapter that keeps backlink vendor payloads behind a stable contract
 */

import { cliError } from "./lib/errors";
import {
  createDataForSeoBacklinksTransport,
  type DataForSeoBacklinksTransport,
  type DataForSeoFetch,
} from "./lib/dataforseo-transport";
import type { BacklinksStatusType } from "./lib/input-validation";

export type BacklinkSummaryRequest = {
  target: string;
  includeSubdomains?: boolean;
  internalListLimit?: number;
  backlinksStatusType?: BacklinksStatusType;
};

export type BacklinkListRequest = {
  target: string;
  limit: number;
  offset: number;
  orderBy?: string;
  excludeInternalBacklinks?: boolean;
  backlinksStatusType?: BacklinksStatusType;
};

export type BacklinkDatasetKind =
  | "summary"
  | "backlinks"
  | "referring_domains"
  | "anchors";

export type BacklinkDataset<TItem = unknown> = {
  target: string;
  dataset: BacklinkDatasetKind;
  capturedAt: string;
  provider: "dataforseo";
  status: {
    providerStatusCode?: number;
    providerStatusMessage?: string;
    providerTaskId: string | null;
    providerCost?: number;
  };
  resultCount: number;
  totals: {
    backlinks?: number | null;
    referringDomains?: number | null;
    referringPages?: number | null;
    referringMainDomains?: number | null;
    rank?: number | null;
    brokenBacklinks?: number | null;
    brokenPages?: number | null;
  };
  items: TItem[];
};

export type BacklinkSummaryItem = {
  target: string | null;
  backlinks: number | null;
  referringDomains: number | null;
  referringPages: number | null;
  referringMainDomains: number | null;
  rank: number | null;
  brokenBacklinks: number | null;
  brokenPages: number | null;
  firstSeen: string | null;
  lostDate: string | null;
  raw: Record<string, unknown>;
};

export type ReferringDomainItem = {
  domain: string | null;
  rank: number | null;
  backlinks: number | null;
  referringPages: number | null;
  firstSeen: string | null;
  lostDate: string | null;
  raw: Record<string, unknown>;
};

export type BacklinkItem = {
  sourceUrl: string | null;
  targetUrl: string | null;
  sourceDomain: string | null;
  targetDomain: string | null;
  anchorText: string | null;
  dofollow: boolean | null;
  firstSeen: string | null;
  lastSeen: string | null;
  pageFromRank: number | null;
  domainFromRank: number | null;
  linksCount: number | null;
  raw: Record<string, unknown>;
};

export type AnchorItem = {
  anchor: string | null;
  rank: number | null;
  backlinks: number | null;
  referringDomains: number | null;
  referringPages: number | null;
  firstSeen: string | null;
  lostDate: string | null;
  raw: Record<string, unknown>;
};

export type BacklinkReadiness = {
  provider: "dataforseo";
  ready: boolean;
  hasLogin: boolean;
  hasPassword: boolean;
};

export type BacklinkClient = {
  checkReadiness: () => Promise<BacklinkReadiness>;
  summary: (
    input: BacklinkSummaryRequest
  ) => Promise<BacklinkDataset<BacklinkSummaryItem>>;
  referringDomains: (
    input: BacklinkListRequest
  ) => Promise<BacklinkDataset<ReferringDomainItem>>;
  backlinks: (
    input: BacklinkListRequest
  ) => Promise<BacklinkDataset<BacklinkItem>>;
  anchors: (
    input: BacklinkListRequest
  ) => Promise<BacklinkDataset<AnchorItem>>;
};

type DataForSeoTask = {
  id?: string;
  status_code?: number;
  status_message?: string;
  cost?: number;
  result_count?: number;
  result?: Array<Record<string, unknown>>;
};

type DataForSeoResponse = {
  status_code?: number;
  status_message?: string;
  tasks?: DataForSeoTask[];
};

export function createBacklinkClient(input: {
  login?: string;
  password?: string;
  fetcher?: DataForSeoFetch;
  backlinksTransport?: DataForSeoBacklinksTransport;
}): BacklinkClient {
  async function request<TItem>(
    dataset: BacklinkDatasetKind,
    body: Record<string, unknown>,
    normalize: (item: Record<string, unknown>) => TItem
  ): Promise<BacklinkDataset<TItem>> {
    requireCredentials(input);
    const transport =
      input.backlinksTransport ??
      createDataForSeoBacklinksTransport({
        login: input.login,
        password: input.password,
        fetcher: input.fetcher,
      });
    const parsed = requireProviderResponse(
      await transport.request(dataset, stripUndefined(body))
    );
    assertProviderAccepted(parsed);

    const task = parsed.tasks?.[0];
    if (!task) {
      throw cliError({
        code: "provider_error",
        message: "DataForSEO response did not include a task.",
      });
    }

    assertTaskAccepted(task);

    const result = task.result?.[0] ?? {};
    const items = readArray(result.items).filter(isRecord).map(normalize);
    const fallbackItems =
      items.length === 0 && dataset === "summary" && Object.keys(result).length > 0
        ? [normalize(result)]
        : items;

    return {
      target: readString(result.target) ?? String(body.target ?? ""),
      dataset,
      capturedAt: new Date().toISOString(),
      provider: "dataforseo",
      status: {
        providerTaskId: task.id ?? null,
        providerStatusCode: task.status_code,
        providerStatusMessage: task.status_message,
        providerCost: task.cost,
      },
      resultCount: task.result_count ?? fallbackItems.length,
      totals: normalizeTotals(result),
      items: fallbackItems,
    };
  }

  return {
    async checkReadiness() {
      return {
        provider: "dataforseo",
        ready: Boolean(input.login && input.password),
        hasLogin: Boolean(input.login),
        hasPassword: Boolean(input.password),
      };
    },
    summary(requestInput) {
      return request(
        "summary",
        {
          target: requestInput.target,
          include_subdomains: requestInput.includeSubdomains,
          internal_list_limit: requestInput.internalListLimit,
          backlinks_status_type: requestInput.backlinksStatusType,
        },
        normalizeSummaryItem
      );
    },
    referringDomains(requestInput) {
      return request(
        "referring_domains",
        listRequestBody(requestInput),
        normalizeReferringDomainItem
      );
    },
    backlinks(requestInput) {
      return request(
        "backlinks",
        listRequestBody(requestInput),
        normalizeBacklinkItem
      );
    },
    anchors(requestInput) {
      return request(
        "anchors",
        listRequestBody(requestInput),
        normalizeAnchorItem
      );
    },
  };
}

function listRequestBody(input: BacklinkListRequest) {
  return {
    target: input.target,
    limit: input.limit,
    offset: input.offset,
    order_by: input.orderBy ? [input.orderBy] : undefined,
    exclude_internal_backlinks: input.excludeInternalBacklinks,
    backlinks_status_type: input.backlinksStatusType,
  };
}

function normalizeSummaryItem(item: Record<string, unknown>): BacklinkSummaryItem {
  return {
    target: readString(item.target),
    backlinks: readNumber(item.backlinks),
    referringDomains: readNumber(item.referring_domains),
    referringPages: readNumber(item.referring_pages),
    referringMainDomains: readNumber(item.referring_main_domains),
    rank: readNumber(item.rank),
    brokenBacklinks: readNumber(item.broken_backlinks),
    brokenPages: readNumber(item.broken_pages),
    firstSeen: readString(item.first_seen),
    lostDate: readString(item.lost_date),
    raw: item,
  };
}

function normalizeReferringDomainItem(
  item: Record<string, unknown>
): ReferringDomainItem {
  return {
    domain: readString(item.domain),
    rank: readNumber(item.rank),
    backlinks: readNumber(item.backlinks),
    referringPages: readNumber(item.referring_pages),
    firstSeen: readString(item.first_seen),
    lostDate: readString(item.lost_date),
    raw: item,
  };
}

function normalizeBacklinkItem(item: Record<string, unknown>): BacklinkItem {
  return {
    sourceUrl: readString(item.url_from),
    targetUrl: readString(item.url_to),
    sourceDomain: readString(item.domain_from),
    targetDomain: readString(item.domain_to),
    anchorText: readString(item.anchor),
    dofollow: readBoolean(item.dofollow),
    firstSeen: readString(item.first_seen),
    lastSeen: readString(item.last_seen) ?? readString(item.prev_seen),
    pageFromRank: readNumber(item.page_from_rank),
    domainFromRank: readNumber(item.domain_from_rank),
    linksCount: readNumber(item.links_count),
    raw: item,
  };
}

function normalizeAnchorItem(item: Record<string, unknown>): AnchorItem {
  return {
    anchor: readString(item.anchor),
    rank: readNumber(item.rank),
    backlinks: readNumber(item.backlinks),
    referringDomains: readNumber(item.referring_domains),
    referringPages: readNumber(item.referring_pages),
    firstSeen: readString(item.first_seen),
    lostDate: readString(item.lost_date),
    raw: item,
  };
}

function normalizeTotals(result: Record<string, unknown>) {
  return {
    backlinks: readNumber(result.backlinks),
    referringDomains: readNumber(result.referring_domains),
    referringPages: readNumber(result.referring_pages),
    referringMainDomains: readNumber(result.referring_main_domains),
    rank: readNumber(result.rank),
    brokenBacklinks: readNumber(result.broken_backlinks),
    brokenPages: readNumber(result.broken_pages),
  };
}

function requireCredentials<TInput extends { login?: string; password?: string }>(
  input: TInput
): asserts input is TInput & { login: string; password: string } {
  if (input.login && input.password) {
    return;
  }

  throw cliError({
    code: "auth_error",
    message: "Missing DataForSEO credentials.",
    hint: "Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD in the active product-growth profile or invocation env.",
  });
}

function requireProviderResponse(parsed: unknown): DataForSeoResponse {
  if (parsed && typeof parsed === "object") {
    return parsed as DataForSeoResponse;
  }

  throw cliError({
    code: "provider_error",
    message: "DataForSEO returned an empty response.",
  });
}

function assertProviderAccepted(parsed: DataForSeoResponse) {
  if (parsed.status_code && parsed.status_code >= 40000) {
    throw classifyProviderStatus(parsed.status_code, parsed.status_message);
  }
}

function assertTaskAccepted(task: DataForSeoTask) {
  if (task.status_code && task.status_code >= 40000) {
    throw classifyProviderStatus(task.status_code, task.status_message);
  }
}

function classifyProviderStatus(statusCode: number, message?: string) {
  if (statusCode === 40204) {
    return cliError({
      code: "quota_error",
      message:
        message ??
        "DataForSEO Backlinks API access is not active for this account.",
      hint: "Activate the DataForSEO Backlinks subscription for this account, then retry.",
    });
  }

  return cliError({
    code: "provider_error",
    message:
      message ?? `DataForSEO request failed with status ${statusCode}.`,
  });
}

function stripUndefined(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}
