/**
 * @input mocked DataForSEO AI Optimization responses
 * @output coverage for normalized LLM response and mention datasets
 * @pos provider behavior tests for DataForSEO-backed AI Optimization workflows
 */

import { describe, expect, test } from "vitest";
import { createAiOptimizationClient } from "./provider";
import type { DataForSeoAiOptimizationTransport } from "./lib/dataforseo-transport";

function createTransport(
  overrides: Partial<DataForSeoAiOptimizationTransport>
): DataForSeoAiOptimizationTransport {
  return {
    llmResponseModels: async () => {
      throw new Error("unexpected llmResponseModels call");
    },
    llmResponseLive: async () => {
      throw new Error("unexpected llmResponseLive call");
    },
    llmMentionMetadata: async () => {
      throw new Error("unexpected llmMentionMetadata call");
    },
    llmMentionLive: async () => {
      throw new Error("unexpected llmMentionLive call");
    },
    ...overrides,
  };
}

describe("ai-optimization provider", () => {
  test("normalizes live LLM response results", async () => {
    const client = createAiOptimizationClient({
      login: "login",
      password: "password",
      aiOptimizationTransport: createTransport({
        async llmResponseLive(provider, body) {
          expect(provider).toBe("chat_gpt");
          expect(body).toMatchObject({
            user_prompt: "What is clonesite.ai?",
            model_name: "gpt-4.1-mini",
            max_output_tokens: 256,
            web_search: true,
            web_search_country_iso_code: "US",
          });

          return {
            status_code: 20000,
            status_message: "Ok.",
            tasks: [
              {
                id: "task-response-1",
                status_code: 20000,
                status_message: "Ok.",
                cost: 0.002,
                result: [
                  {
                    model_name: "gpt-4.1-mini",
                    input_tokens: 12,
                    output_tokens: 23,
                    reasoning_tokens: 0,
                    web_search: true,
                    money_spent: 0.002,
                    datetime: "2026-07-06 09:00:00 +00:00",
                    fan_out_queries: ["clonesite.ai"],
                    items: [
                      {
                        type: "message",
                        sections: [
                          {
                            type: "text",
                            text: "Clonesite.ai is a website cloning tool.",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          };
        },
      }),
    });

    const result = await client.llmResponseLive({
      provider: "chat_gpt",
      prompt: "What is clonesite.ai?",
      modelName: "gpt-4.1-mini",
      maxOutputTokens: 256,
      webSearch: true,
      webSearchCountryIsoCode: "US",
    });

    expect(result).toEqual(
      expect.objectContaining({
        provider: "dataforseo",
        llmProvider: "chat_gpt",
        prompt: "What is clonesite.ai?",
        modelName: "gpt-4.1-mini",
        inputTokens: 12,
        outputTokens: 23,
        reasoningTokens: 0,
        webSearch: true,
        moneySpent: 0.002,
        billing: {
          cost: 0.002,
          currency: "USD",
          source: "task_cost",
          modelCost: 0.002,
        },
        datetime: "2026-07-06 09:00:00 +00:00",
        text: "Clonesite.ai is a website cloning tool.",
      })
    );
    expect(result.fanOutQueries).toEqual(["clonesite.ai"]);
    expect(result.raw.providerTaskId).toBe("task-response-1");
    expect(result.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test("normalizes LLM mention search results and maps target fields", async () => {
    const client = createAiOptimizationClient({
      login: "login",
      password: "password",
      defaultLocationCode: 2840,
      defaultLanguageCode: "en",
      aiOptimizationTransport: createTransport({
        async llmMentionLive(dataset, body) {
          expect(dataset).toBe("search");
          expect(body).toMatchObject({
            location_code: 2840,
            language_code: "en",
            platform: "google",
            limit: 5,
            target: [
              {
                domain: "clonesite.ai",
                include_subdomains: true,
                search_scope: ["sources"],
              },
            ],
          });

          return {
            status_code: 20000,
            status_message: "Ok.",
            tasks: [
              {
                id: "task-mention-1",
                status_code: 20000,
                status_message: "Ok.",
                cost: 0.1,
                result: [
                  {
                    total_count: 2,
                    items_count: 1,
                    current_offset: 0,
                    search_after_token: "next-token",
                    total: { ai_search_volume: 10 },
                    items: [
                      {
                        question: "best website cloning tools",
                        answer: "Clonesite.ai is mentioned here.",
                      },
                    ],
                  },
                ],
              },
            ],
          };
        },
      }),
    });

    const result = await client.llmMentionLive("search", {
      domain: "clonesite.ai",
      includeSubdomains: true,
      searchScope: ["sources"],
      platform: "google",
      limit: 5,
    });

    expect(result).toEqual(
      expect.objectContaining({
        dataset: "search",
        provider: "dataforseo",
        billing: {
          cost: 0.1,
          currency: "USD",
          source: "task_cost",
        },
        totalCount: 2,
        itemsCount: 1,
        currentOffset: 0,
        searchAfterToken: "next-token",
      })
    );
    expect(result.total).toEqual({ ai_search_volume: 10 });
    expect(result.items).toHaveLength(1);
    expect(result.raw.providerTaskId).toBe("task-mention-1");
  });

  test("fails before provider calls when credentials are missing", async () => {
    const client = createAiOptimizationClient({
      aiOptimizationTransport: createTransport({}),
    });

    await expect(
      client.llmResponseModels("chat_gpt")
    ).rejects.toMatchObject({
      code: "auth_error",
    });
  });
});
