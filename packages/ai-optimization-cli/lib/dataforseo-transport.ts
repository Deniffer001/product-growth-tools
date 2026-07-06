/**
 * @input DataForSEO credentials and optional fetch implementation
 * @output authenticated DataForSEO AI Optimization SDK transport
 * @pos SDK transport boundary for provider adapters
 */

import {
  AiOptimizationApi,
  AiOptimizationChatGptLlmResponsesLiveRequestInfo,
  AiOptimizationClaudeLlmResponsesLiveRequestInfo,
  AiOptimizationGeminiLlmResponsesLiveRequestInfo,
  AiOptimizationLlmMentionsAggregatedMetricsLiveRequestInfo,
  AiOptimizationLlmMentionsCrossAggregatedMetricsLiveRequestInfo,
  AiOptimizationLlmMentionsSearchLiveRequestInfo,
  AiOptimizationLlmMentionsTopDomainsLiveRequestInfo,
  AiOptimizationLlmMentionsTopPagesLiveRequestInfo,
  AiOptimizationPerplexityLlmResponsesLiveRequestInfo,
} from "dataforseo-client";

import type {
  LlmMentionDatasetKind,
  LlmMentionMetadataKind,
  LlmResponseProvider,
} from "../provider";

const DATAFORSEO_BASE_URL = "https://api.dataforseo.com";

export type DataForSeoFetch = (
  url: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1]
) => ReturnType<typeof fetch>;

export type DataForSeoAiOptimizationTransport = {
  llmResponseModels: (provider: LlmResponseProvider) => Promise<unknown>;
  llmResponseLive: (
    provider: LlmResponseProvider,
    body: Record<string, unknown>
  ) => Promise<unknown>;
  llmMentionMetadata: (dataset: LlmMentionMetadataKind) => Promise<unknown>;
  llmMentionLive: (
    dataset: LlmMentionDatasetKind,
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

export function createDataForSeoAiOptimizationTransport(input: {
  login: string;
  password: string;
  fetcher?: DataForSeoFetch;
}): DataForSeoAiOptimizationTransport {
  const api = new AiOptimizationApi(DATAFORSEO_BASE_URL, {
    fetch: createAuthenticatedDataForSeoFetch(input),
  });

  return {
    llmResponseModels(provider) {
      switch (provider) {
        case "chat_gpt":
          return api.chatGptLlmResponsesModels();
        case "claude":
          return api.claudeLlmResponsesModels();
        case "gemini":
          return api.geminiLlmResponsesModels();
        case "perplexity":
          return api.perplexityLlmResponsesModels();
      }
    },
    llmResponseLive(provider, body) {
      switch (provider) {
        case "chat_gpt":
          return api.chatGptLlmResponsesLive([
            AiOptimizationChatGptLlmResponsesLiveRequestInfo.fromJS(body),
          ]);
        case "claude":
          return api.claudeLlmResponsesLive([
            AiOptimizationClaudeLlmResponsesLiveRequestInfo.fromJS(body),
          ]);
        case "gemini":
          return api.geminiLlmResponsesLive([
            AiOptimizationGeminiLlmResponsesLiveRequestInfo.fromJS(body),
          ]);
        case "perplexity":
          return api.perplexityLlmResponsesLive([
            AiOptimizationPerplexityLlmResponsesLiveRequestInfo.fromJS(body),
          ]);
      }
    },
    llmMentionMetadata(dataset) {
      switch (dataset) {
        case "locations_and_languages":
          return api.llmMentionsLocationsAndLanguages();
        case "available_filters":
          return api.llmMentionsAvailableFilters();
      }
    },
    llmMentionLive(dataset, body) {
      switch (dataset) {
        case "search":
          return api.llmMentionsSearchLive([
            AiOptimizationLlmMentionsSearchLiveRequestInfo.fromJS(body),
          ]);
        case "top_pages":
          return api.llmMentionsTopPagesLive([
            AiOptimizationLlmMentionsTopPagesLiveRequestInfo.fromJS(body),
          ]);
        case "top_domains":
          return api.llmMentionsTopDomainsLive([
            AiOptimizationLlmMentionsTopDomainsLiveRequestInfo.fromJS(body),
          ]);
        case "aggregated_metrics":
          return api.llmMentionsAggregatedMetricsLive([
            AiOptimizationLlmMentionsAggregatedMetricsLiveRequestInfo.fromJS(body),
          ]);
        case "cross_aggregated_metrics":
          return api.llmMentionsCrossAggregatedMetricsLive([
            AiOptimizationLlmMentionsCrossAggregatedMetricsLiveRequestInfo.fromJS(
              body
            ),
          ]);
      }
    },
  };
}
