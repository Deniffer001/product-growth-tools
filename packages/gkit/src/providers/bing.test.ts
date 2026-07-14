import { describe, expect, it } from "vitest";

import { buildBingUrls, dispatchBing, planBingRequest } from "./bing";

describe("Bing adapter", () => {
  it("sends apikey only in the request URL and exposes a key-free diagnostic URL", async () => {
    const apiKey = "secret+/key=value";
    let capturedUrl = "";
    const result = await dispatchBing({
      operation: { adapterKey: "traffic.query", input: { query: "clone site" } },
      config: { siteUrl: "https://example.com/" },
      credentials: { apiKey },
      signal: new AbortController().signal,
      fetch: async (input) => {
        capturedUrl = String(input);
        return new Response(JSON.stringify({ d: [{ Clicks: 1 }] }), {
          status: 200,
          headers: { "x-ms-request-id": "bing-123" },
        });
      },
    });

    expect(capturedUrl).toContain(`apikey=${encodeURIComponent(apiKey)}`);
    expect(new URL(capturedUrl).searchParams.get("query")).toBe(JSON.stringify("clone site"));
    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        providerRequestId: "bing-123",
        data: expect.objectContaining({ rowCount: 1 }),
      }),
    );
    expect(JSON.stringify(result)).not.toContain(apiKey);
    expect(JSON.stringify(result)).not.toContain(encodeURIComponent(apiKey));
  });

  it("redacts encoded and decoded API key variants from every provider failure path", async () => {
    const apiKey = "danger+/token=value";
    const result = await dispatchBing({
      operation: { adapterKey: "sites.list", input: {} },
      config: {},
      credentials: { apiKey },
      signal: new AbortController().signal,
      fetch: async () =>
        new Response(JSON.stringify({ ErrorCode: 3, Message: `bad ${apiKey}` }), {
          status: 400,
        }),
    });

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: "AUTH_FAILED",
        details: expect.objectContaining({
          httpStatus: 400,
          providerCode: 3,
          diagnosticUrl: "https://ssl.bing.com/webmaster/api.svc/json/GetUserSites",
        }),
      }),
    );
    const rendered = JSON.stringify(result);
    expect(rendered).not.toContain(apiKey);
    expect(rendered).not.toContain(encodeURIComponent(apiKey));
  });

  it("plans only fixed-origin reviewed methods", () => {
    const plan = planBingRequest(
      { adapterKey: "links.url", input: { link: "https://example.com/docs", page: 0 } },
      { siteUrl: "https://example.com/" },
    );
    expect(plan).toEqual({
      method: "GET",
      endpoint:
        "https://ssl.bing.com/webmaster/api.svc/json/GetUrlLinks?siteUrl=https%3A%2F%2Fexample.com%2F&link=%22https%3A%2F%2Fexample.com%2Fdocs%22&page=0",
      diagnosticUrl:
        "https://ssl.bing.com/webmaster/api.svc/json/GetUrlLinks?siteUrl=https%3A%2F%2Fexample.com%2F&link=%22https%3A%2F%2Fexample.com%2Fdocs%22&page=0",
    });
    expect(buildBingUrls({ method: "GetUserSites", params: {} }).requestUrl).toBeNull();
  });
});
