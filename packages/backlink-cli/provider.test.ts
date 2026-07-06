/**
 * @input mocked DataForSEO Backlinks API responses
 * @output coverage for normalized backlink artifacts and provider errors
 * @pos provider behavior tests for DataForSEO-backed backlink reads
 */

import { describe, expect, test } from "vitest";
import { createBacklinkClient } from "./provider";

describe("backlink provider", () => {
  test("normalizes DataForSEO summary responses", async () => {
    const client = createBacklinkClient({
      login: "login",
      password: "password",
      fetcher: async (url, init) => {
        expect(url).toBe(
          "https://api.dataforseo.com/v3/backlinks/summary/live"
        );
        expect(init?.method).toBe("POST");
        expect(new Headers(init?.headers).get("Authorization")).toContain(
          "Basic "
        );
        expect(String(init?.body)).toContain("openclawai.io");
        expect(String(init?.body)).toContain("include_subdomains");

        return new Response(
          JSON.stringify({
              status_code: 20000,
              tasks: [
                {
                  id: "task-1",
                  status_code: 20000,
                  status_message: "Ok.",
                  cost: 0.02,
                  result_count: 1,
                  result: [
                    {
                      target: "openclawai.io",
                      backlinks: 10,
                      referring_domains: 4,
                      referring_pages: 8,
                      referring_main_domains: 3,
                      rank: 12,
                      broken_backlinks: 1,
                      broken_pages: 1,
                      first_seen: "2026-04-01 00:00:00 +00:00",
                      lost_date: null,
                    },
                  ],
                },
              ],
            }),
          { status: 200 }
        );
      },
    });

    const result = await client.summary({
      target: "openclawai.io",
      includeSubdomains: true,
      internalListLimit: 5,
      backlinksStatusType: "all",
    });

    expect(result).toEqual(
      expect.objectContaining({
        target: "openclawai.io",
        dataset: "summary",
        provider: "dataforseo",
        resultCount: 1,
        totals: expect.objectContaining({
          backlinks: 10,
          referringDomains: 4,
          rank: 12,
        }),
      })
    );
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        target: "openclawai.io",
        backlinks: 10,
        referringDomains: 4,
        firstSeen: "2026-04-01 00:00:00 +00:00",
      })
    );
    expect(result.status.providerTaskId).toBe("task-1");
    expect(result.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test("normalizes backlinks list responses", async () => {
    const client = createBacklinkClient({
      login: "login",
      password: "password",
      fetcher: async (url, init) => {
        expect(url).toBe(
          "https://api.dataforseo.com/v3/backlinks/backlinks/live"
        );
        expect(String(init?.body)).toContain("https://openclawai.io/");
        expect(String(init?.body)).toContain('"order_by":["rank,desc"]');

        return new Response(
          JSON.stringify({
              status_code: 20000,
              tasks: [
                {
                  id: "task-2",
                  status_code: 20000,
                  result_count: 1,
                  result: [
                    {
                      target: "https://openclawai.io/",
                      items: [
                        {
                          url_from: "https://example.com/post",
                          url_to: "https://openclawai.io/",
                          domain_from: "example.com",
                          domain_to: "openclawai.io",
                          anchor: "OpenClaw",
                          dofollow: true,
                          first_seen: "2026-04-01 00:00:00 +00:00",
                          last_seen: "2026-04-20 00:00:00 +00:00",
                          page_from_rank: 42,
                          domain_from_rank: 60,
                          links_count: 1,
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

    const result = await client.backlinks({
      target: "https://openclawai.io/",
      limit: 10,
      offset: 0,
      orderBy: "rank,desc",
      excludeInternalBacklinks: true,
      backlinksStatusType: "all",
    });

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        sourceUrl: "https://example.com/post",
        targetUrl: "https://openclawai.io/",
        anchorText: "OpenClaw",
        dofollow: true,
        pageFromRank: 42,
        domainFromRank: 60,
      })
    );
  });

  test("classifies inactive Backlinks subscription as quota error", async () => {
    const client = createBacklinkClient({
      login: "login",
      password: "password",
      fetcher: async () =>
        new Response(
          JSON.stringify({
            status_code: 20000,
            tasks: [
              {
                id: "task-denied",
                status_code: 40204,
                status_message: "Access denied.",
                result_count: 0,
                result: [],
              },
            ],
          }),
          { status: 200 }
        ),
    });

    await expect(
      client.summary({ target: "openclawai.io" })
    ).rejects.toMatchObject({
      code: "quota_error",
      message: "Access denied.",
    });
  });
});
