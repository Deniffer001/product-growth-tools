/**
 * @input mocked DataForSEO responses
 * @output coverage for normalized SERP snapshot artifacts
 * @pos provider behavior tests for DataForSEO-backed SERP snapshots
 */

import { describe, expect, test } from "vitest";
import { createSerpSnapshotClient } from "./provider";

describe("serp-snapshot provider", () => {
  test("normalizes DataForSEO organic results and SERP features", async () => {
    const client = createSerpSnapshotClient({
      login: "login",
      password: "password",
      fetcher: async (_url, init) => {
        expect(init?.method).toBe("POST");
        expect(new Headers(init?.headers).get("Authorization")).toContain(
          "Basic "
        );
        expect(String(init?.body)).toContain("typeless alternative for mac");
        expect(String(init?.body)).toContain('"location_code":2840');

        return new Response(
          JSON.stringify({
            status_code: 20000,
            cost: 0.0101,
            tasks: [
              {
                id: "task-1",
                status_code: 20000,
                cost: 0.0101,
                result: [
                  {
                    keyword: "typeless alternative for mac",
                    check_url: "https://www.google.com/search?q=typeless",
                    items: [
                      {
                        type: "ai_overview",
                        rank_group: 1,
                        title: "AI overview",
                        description: "A generated overview.",
                      },
                      {
                        type: "organic",
                        rank_group: 1,
                        title: "Typeless Alternatives",
                        url: "https://alternativeto.net/software/typeless/",
                        domain: "alternativeto.net",
                        description: "A list of alternatives.",
                        breadcrumb: "alternativeto.net > software",
                      },
                      {
                        type: "people_also_ask",
                      },
                      {
                        type: "featured_snippet",
                        rank_group: 0,
                        title: "Best voice typing app",
                        url: "https://example.com/voice-typing",
                        description: "A featured answer.",
                      },
                    ],
                  },
                ],
              },
            ],
          }),
          { status: 200 }
        );
      },
    });

    const result = await client.query({
      query: "typeless alternative for mac",
      country: "US",
      language: "en",
      device: "desktop",
      os: "macos",
      depth: 20,
    });

    expect(result).toEqual(
      expect.objectContaining({
        query: "typeless alternative for mac",
        engine: "google",
        country: "US",
        language: "en",
        device: "desktop",
        os: "macos",
        provider: "dataforseo",
        billing: {
          cost: 0.0101,
          currency: "USD",
          source: "task_cost",
        },
        checkUrl: "https://www.google.com/search?q=typeless",
        resultCount: 3,
        organicResultCount: 1,
        serpFeatureCount: 2,
      })
    );
    expect(result.features.peopleAlsoAsk).toBe(true);
    expect(result.features.featuredSnippet).toBe(true);
    expect(result.features.aiOverview).toBe("present");
    expect(result.organicResults).toHaveLength(1);
    expect(result.serpFeatures).toEqual([
      expect.objectContaining({
        type: "ai_overview",
        title: "AI overview",
        snippet: "A generated overview.",
      }),
      expect.objectContaining({
        type: "featured_snippet",
        title: "Best voice typing app",
      }),
    ]);
    expect(result.organicResults[0]).toEqual(
      expect.objectContaining({
        rank: 1,
        type: "organic",
        domain: "alternativeto.net",
        resultClass: "directory",
      })
    );
    expect(result.results.map((entry) => entry.type)).toEqual([
      "ai_overview",
      "organic",
      "featured_snippet",
    ]);
    expect(result.raw.providerTaskId).toBe("task-1");
    expect(result.raw.cost).toBe(0.0101);
    expect(result.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
