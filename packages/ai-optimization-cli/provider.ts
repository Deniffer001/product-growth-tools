/**
 * @input DataForSEO AI Optimization API responses
 * @output normalized LLM response and mention datasets
 * @pos provider adapter that keeps DataForSEO payloads behind a stable contract
 */

import { cliError } from "./lib/errors";
import {
  createDataForSeoAiOptimizationTransport,
  type DataForSeoAiOptimizationTransport,
  type DataForSeoFetch,
} from "./lib/dataforseo-transport";

export type LlmResponseProvider =
  | "chat_gpt"
  | "claude"
  | "gemini"
  | "perplexity";

export type LlmMentionMetadataKind =
  | "locations_and_languages"
  | "available_filters";

export type LlmMentionDatasetKind =
  | "search"
  | "top_pages"
  | "top_domains"
  | "aggregated_metrics"
  | "cross_aggregated_metrics";

export type LlmMessage = {
  role: "user" | "ai";
  message: string;
};

export type LlmResponseLiveRequest = {
  provider: LlmResponseProvider;
  prompt: string;
  modelName: string;
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
  webSearch?: boolean;
  forceWebSearch?: boolean;
  webSearchCountryIsoCode?: string;
  webSearchCity?: string;
  systemMessage?: string;
  messageChain?: LlmMessage[];
  useReasoning?: boolean;
  tag?: string;
};

export type LlmMentionTarget = {
  domain?: string;
  keyword?: string;
  includeSubdomains?: boolean;
  matchType?: string;
  searchScope?: string[];
  searchFilter?: string;
};

export type LlmMentionCrossTarget = {
  aggregationKey: string;
  target: LlmMentionTarget[];
};

export type LlmMentionRequest = {
  domain?: string;
  keyword?: string;
  target?: LlmMentionTarget[];
  targets?: LlmMentionCrossTarget[];
  aggregationKey?: string;
  includeSubdomains?: boolean;
  matchType?: string;
  searchScope?: string[];
  searchFilter?: string;
  locationName?: string;
  locationCode?: number;
  languageName?: string;
  languageCode?: string;
  platform?: string;
  filters?: unknown[];
  initialDatasetFilters?: unknown[];
  orderBy?: string[];
  offset?: number;
  searchAfterToken?: string;
  limit?: number;
  linksScope?: string;
  itemsListLimit?: number;
  internalListLimit?: number;
  tag?: string;
};

export type AiOptimizationDataset = {
  dataset: string;
  capturedAt: string;
  provider: "dataforseo";
  billing: DataForSeoBilling;
  status: DataForSeoStatus;
  resultCount: number;
  items: Array<Record<string, unknown>>;
  raw: {
    providerTaskId: string | null;
    providerStatusCode?: number;
    taskStatusCode?: number;
    cost?: number;
  };
};

export type LlmResponseDataset = {
  provider: "dataforseo";
  llmProvider: LlmResponseProvider;
  prompt: string;
  modelName: string | null;
  capturedAt: string;
  inputTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  webSearch: boolean | null;
  moneySpent: number | null;
  billing: DataForSeoBilling & {
    modelCost: number | null;
  };
  datetime: string | null;
  text: string | null;
  fanOutQueries: unknown[];
  items: unknown[];
  status: DataForSeoStatus;
  raw: {
    providerTaskId: string | null;
    providerStatusCode?: number;
    taskStatusCode?: number;
    cost?: number;
    result: Record<string, unknown>;
  };
};

export type LlmMentionDataset = {
  dataset: LlmMentionDatasetKind;
  capturedAt: string;
  provider: "dataforseo";
  billing: DataForSeoBilling;
  status: DataForSeoStatus;
  totalCount: number | null;
  itemsCount: number;
  currentOffset: number | null;
  searchAfterToken: string | null;
  total: Record<string, unknown> | null;
  items: unknown[];
  raw: {
    providerTaskId: string | null;
    providerStatusCode?: number;
    taskStatusCode?: number;
    cost?: number;
    result: Record<string, unknown>;
  };
};

export type AiOptimizationClient = {
  checkReadiness: () => Promise<{
    provider: "dataforseo";
    ready: boolean;
    hasLogin: boolean;
    hasPassword: boolean;
  }>;
  llmResponseModels: (
    provider: LlmResponseProvider
  ) => Promise<AiOptimizationDataset>;
  llmResponseLive: (
    input: LlmResponseLiveRequest
  ) => Promise<LlmResponseDataset>;
  llmMentionMetadata: (
    dataset: LlmMentionMetadataKind
  ) => Promise<AiOptimizationDataset>;
  llmMentionLive: (
    dataset: LlmMentionDatasetKind,
    input: LlmMentionRequest
  ) => Promise<LlmMentionDataset>;
};

type DataForSeoStatus = {
  providerStatusCode?: number;
  providerStatusMessage?: string;
  taskStatusCode?: number;
  taskStatusMessage?: string;
};

type DataForSeoBilling = {
  cost: number | null;
  currency: "USD";
  source: "task_cost" | "response_cost" | "unknown";
};

type DataForSeoTask = {
  id?: string;
  status_code?: number;
  status_message?: string;
  cost?: number;
  result_count?: number;
  result?: unknown[];
};

type DataForSeoResponse = {
  status_code?: number;
  status_message?: string;
  cost?: number;
  tasks?: DataForSeoTask[];
  result?: unknown[];
};

export function createAiOptimizationClient(input: {
  login?: string;
  password?: string;
  defaultLocationCode?: number;
  defaultLanguageCode?: string;
  fetcher?: DataForSeoFetch;
  aiOptimizationTransport?: DataForSeoAiOptimizationTransport;
}): AiOptimizationClient {
  return {
    async checkReadiness() {
      return {
        provider: "dataforseo",
        ready: Boolean(input.login && input.password),
        hasLogin: Boolean(input.login),
        hasPassword: Boolean(input.password),
      };
    },
    async llmResponseModels(provider) {
      requireCredentials(input);
      const transport = resolveTransport(input);
      const parsed = requireProviderResponse(
        await transport.llmResponseModels(provider)
      );
      assertProviderAccepted(parsed);
      return normalizeDataset(`llm_response_models.${provider}`, parsed);
    },
    async llmResponseLive(request) {
      requireCredentials(input);
      const transport = resolveTransport(input);
      const parsed = requireProviderResponse(
        await transport.llmResponseLive(
          request.provider,
          buildLlmResponseBody(request)
        )
      );
      assertProviderAccepted(parsed);
      return normalizeLlmResponse(request, parsed);
    },
    async llmMentionMetadata(dataset) {
      requireCredentials(input);
      const transport = resolveTransport(input);
      const parsed = requireProviderResponse(
        await transport.llmMentionMetadata(dataset)
      );
      assertProviderAccepted(parsed);
      return normalizeDataset(`llm_mentions.${dataset}`, parsed);
    },
    async llmMentionLive(dataset, request) {
      requireCredentials(input);
      const transport = resolveTransport(input);
      const parsed = requireProviderResponse(
        await transport.llmMentionLive(
          dataset,
          buildLlmMentionBody(dataset, request, input)
        )
      );
      assertProviderAccepted(parsed);
      return normalizeLlmMention(dataset, parsed);
    },
  };
}

function resolveTransport(input: {
  login: string;
  password: string;
  fetcher?: DataForSeoFetch;
  aiOptimizationTransport?: DataForSeoAiOptimizationTransport;
}) {
  return (
    input.aiOptimizationTransport ??
    createDataForSeoAiOptimizationTransport({
      login: input.login,
      password: input.password,
      fetcher: input.fetcher,
    })
  );
}

function buildLlmResponseBody(input: LlmResponseLiveRequest) {
  return stripUndefined({
    user_prompt: input.prompt,
    model_name: input.modelName,
    max_output_tokens: input.maxOutputTokens,
    temperature: input.temperature,
    top_p: input.topP,
    web_search: input.webSearch,
    force_web_search: input.forceWebSearch,
    web_search_country_iso_code: input.webSearchCountryIsoCode,
    web_search_city: input.webSearchCity,
    system_message: input.systemMessage,
    message_chain: input.messageChain,
    use_reasoning: input.useReasoning,
    tag: input.tag,
  });
}

function buildLlmMentionBody(
  dataset: LlmMentionDatasetKind,
  input: LlmMentionRequest,
  defaults: { defaultLocationCode?: number; defaultLanguageCode?: string }
) {
  const base = stripUndefined({
    location_name: input.locationName,
    location_code: input.locationCode ?? defaults.defaultLocationCode,
    language_name: input.languageName,
    language_code: input.languageCode ?? defaults.defaultLanguageCode,
    platform: input.platform,
    filters: input.filters,
    initial_dataset_filters: input.initialDatasetFilters,
    order_by: input.orderBy,
    offset: input.offset,
    search_after_token: input.searchAfterToken,
    limit: input.limit,
    links_scope: input.linksScope,
    items_list_limit: input.itemsListLimit,
    internal_list_limit: input.internalListLimit,
    tag: input.tag,
  });

  if (dataset === "cross_aggregated_metrics") {
    const targets =
      input.targets ??
      (input.aggregationKey
        ? [
            {
              aggregationKey: input.aggregationKey,
              target: buildMentionTarget(input),
            },
          ]
        : undefined);

    if (!targets?.length) {
      throw cliError({
        code: "invalid_input",
        message:
          "cross_aggregated_metrics requires targets or aggregationKey plus domain/keyword.",
      });
    }

    return {
      ...base,
      targets: targets.map((target) => ({
        aggregation_key: target.aggregationKey,
        target: target.target.map(toProviderMentionTarget),
      })),
    };
  }

  return {
    ...base,
    target: buildMentionTarget(input).map(toProviderMentionTarget),
  };
}

function buildMentionTarget(input: LlmMentionRequest) {
  if (input.target?.length) {
    return input.target;
  }

  const target = stripUndefined({
    domain: input.domain,
    keyword: input.keyword,
    includeSubdomains: input.includeSubdomains,
    matchType: input.matchType,
    searchScope: input.searchScope,
    searchFilter: input.searchFilter,
  });

  if (!target.domain && !target.keyword) {
    throw cliError({
      code: "invalid_input",
      message: "LLM mention requests require domain, keyword, or target.",
    });
  }

  return [target];
}

function toProviderMentionTarget(input: LlmMentionTarget) {
  return stripUndefined({
    type: input.domain ? "domain" : "keyword",
    domain: input.domain,
    keyword: input.keyword,
    include_subdomains: input.includeSubdomains,
    match_type: input.matchType,
    search_scope: input.searchScope,
    search_filter: input.searchFilter,
  });
}

function normalizeDataset(
  dataset: string,
  parsed: DataForSeoResponse
): AiOptimizationDataset {
  const task = firstTask(parsed);
  if (task) {
    assertTaskAccepted(task);
  }

  const items = toRecordArray(task?.result ?? parsed.result ?? []);

  return {
    dataset,
    capturedAt: new Date().toISOString(),
    provider: "dataforseo",
    billing: billingFrom(parsed, task),
    status: statusFrom(parsed, task),
    resultCount: task?.result_count ?? items.length,
    items,
    raw: rawTask(parsed, task),
  };
}

function normalizeLlmResponse(
  request: LlmResponseLiveRequest,
  parsed: DataForSeoResponse
): LlmResponseDataset {
  const task = requireFirstTask(parsed);
  assertTaskAccepted(task);
  const result = toRecord(task.result?.[0]) ?? {};
  const items = Array.isArray(result.items) ? result.items : [];
  const moneySpent = readNumber(result.money_spent);

  return {
    provider: "dataforseo",
    llmProvider: request.provider,
    prompt: request.prompt,
    modelName: readString(result.model_name) ?? request.modelName ?? null,
    capturedAt: new Date().toISOString(),
    inputTokens: readNumber(result.input_tokens),
    outputTokens: readNumber(result.output_tokens),
    reasoningTokens: readNumber(result.reasoning_tokens),
    webSearch: readBoolean(result.web_search),
    moneySpent,
    billing: {
      ...billingFrom(parsed, task),
      modelCost: moneySpent,
    },
    datetime: readString(result.datetime),
    text: collectResponseText(items),
    fanOutQueries: Array.isArray(result.fan_out_queries)
      ? result.fan_out_queries
      : [],
    items,
    status: statusFrom(parsed, task),
    raw: {
      ...rawTask(parsed, task),
      result,
    },
  };
}

function normalizeLlmMention(
  dataset: LlmMentionDatasetKind,
  parsed: DataForSeoResponse
): LlmMentionDataset {
  const task = requireFirstTask(parsed);
  assertTaskAccepted(task);
  const result = toRecord(task.result?.[0]) ?? {};
  const items = Array.isArray(result.items) ? result.items : [];

  return {
    dataset,
    capturedAt: new Date().toISOString(),
    provider: "dataforseo",
    billing: billingFrom(parsed, task),
    status: statusFrom(parsed, task),
    totalCount: readNumber(result.total_count),
    itemsCount: readNumber(result.items_count) ?? items.length,
    currentOffset: readNumber(result.current_offset),
    searchAfterToken: readString(result.search_after_token),
    total: toRecord(result.total),
    items,
    raw: {
      ...rawTask(parsed, task),
      result,
    },
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
    throw cliError({
      code: "provider_error",
      message:
        parsed.status_message ??
        `DataForSEO request failed with status ${parsed.status_code}.`,
    });
  }
}

function assertTaskAccepted(task: DataForSeoTask) {
  if (task.status_code && task.status_code >= 40000) {
    throw cliError({
      code: "provider_error",
      message:
        task.status_message ??
        `DataForSEO task failed with status ${task.status_code}.`,
    });
  }
}

function requireFirstTask(parsed: DataForSeoResponse) {
  const task = firstTask(parsed);
  if (task) {
    return task;
  }

  throw cliError({
    code: "provider_error",
    message: "DataForSEO response did not include a task.",
  });
}

function firstTask(parsed: DataForSeoResponse) {
  return parsed.tasks?.[0];
}

function statusFrom(
  parsed: DataForSeoResponse,
  task?: DataForSeoTask
): DataForSeoStatus {
  return {
    providerStatusCode: parsed.status_code,
    providerStatusMessage: parsed.status_message,
    taskStatusCode: task?.status_code,
    taskStatusMessage: task?.status_message,
  };
}

function rawTask(parsed: DataForSeoResponse, task?: DataForSeoTask) {
  return {
    providerTaskId: task?.id ?? null,
    providerStatusCode: parsed.status_code,
    taskStatusCode: task?.status_code,
    cost: task?.cost ?? parsed.cost,
  };
}

function billingFrom(
  parsed: DataForSeoResponse,
  task?: DataForSeoTask
): DataForSeoBilling {
  const taskCost = readNumber(task?.cost);
  if (taskCost !== null) {
    return { cost: taskCost, currency: "USD", source: "task_cost" };
  }

  const responseCost = readNumber(parsed.cost);
  if (responseCost !== null) {
    return { cost: responseCost, currency: "USD", source: "response_cost" };
  }

  return { cost: null, currency: "USD", source: "unknown" };
}

function collectResponseText(items: unknown[]) {
  const chunks: string[] = [];

  for (const item of items) {
    const record = toRecord(item);
    if (!record) {
      continue;
    }
    if (typeof record.text === "string" && record.text.trim()) {
      chunks.push(record.text.trim());
    }
    if (typeof record.content === "string" && record.content.trim()) {
      chunks.push(record.content.trim());
    }

    if (Array.isArray(record.sections)) {
      for (const section of record.sections) {
        const sectionRecord = toRecord(section);
        const text = readString(sectionRecord?.text);
        if (text?.trim()) {
          chunks.push(text.trim());
        }
      }
    }
  }

  if (chunks.length === 0) {
    return null;
  }

  return [...new Set(chunks)].join("\n\n");
}

function stripUndefined<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  ) as {
    [K in keyof T as undefined extends T[K] ? K : K]: Exclude<T[K], undefined>;
  };
}

function toRecordArray(input: unknown) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.flatMap((item) => {
    const record = toRecord(item);
    return record ? [record] : [];
  });
}

function toRecord(input: unknown): Record<string, unknown> | null {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }

  return null;
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
