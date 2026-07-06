/**
 * @input mocked fetch calls through DataForSEO SDK request classes
 * @output coverage for nested request serialization sent to DataForSEO
 * @pos transport regression tests for SDK class construction behavior
 */

import { describe, expect, test } from "vitest";
import { createDataForSeoAiOptimizationTransport } from "./dataforseo-transport";

describe("DataForSEO AI Optimization transport", () => {
  test("serializes LLM mention target elements through SDK fromJS", async () => {
    const transport = createDataForSeoAiOptimizationTransport({
      login: "login",
      password: "password",
      fetcher: async (url, init) => {
        expect(String(url)).toContain(
          "/v3/ai_optimization/llm_mentions/search/live"
        );
        expect(JSON.parse(String(init?.body))).toEqual([
          {
            target: [
              {
                domain: "clonesite.ai",
                include_subdomains: true,
              },
            ],
            platform: "google",
            limit: 3,
          },
        ]);

        return new Response(
          JSON.stringify({
            status_code: 20000,
            status_message: "Ok.",
            tasks: [],
          }),
          { status: 200 }
        );
      },
    });

    await transport.llmMentionLive("search", {
      target: [
        {
          type: "domain",
          domain: "clonesite.ai",
          include_subdomains: true,
        },
      ],
      platform: "google",
      limit: 3,
    });
  });
});
