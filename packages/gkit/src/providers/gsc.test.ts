import { describe, expect, it } from "vitest";

import { dispatchGsc, planGscRequest } from "./gsc";

describe("GSC adapter", () => {
  it("encodes the property path and keeps Search Analytics as a POST read", async () => {
    let capturedUrl = "";
    let capturedBody = "";
    const result = await dispatchGsc({
      operation: {
        adapterKey: "search-analytics.query",
        input: {
          startDate: "2026-07-01",
          endDate: "2026-07-07",
          dimensions: ["query"],
          rowLimit: 25,
        },
      },
      config: { siteUrl: "sc-domain:example.com" },
      credentials: { accessToken: "access-secret" },
      signal: new AbortController().signal,
      fetch: async (input, init) => {
        capturedUrl = String(input);
        capturedBody = String(init?.body);
        expect(new Headers(init?.headers).get("authorization")).toBe("Bearer access-secret");
        return new Response(JSON.stringify({ rows: [{ keys: ["clone site"], clicks: 1 }] }), {
          status: 200,
        });
      },
    });

    expect(capturedUrl).toBe(
      "https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Aexample.com/searchAnalytics/query",
    );
    expect(JSON.parse(capturedBody)).toEqual({
      startDate: "2026-07-01",
      endDate: "2026-07-07",
      dimensions: ["query"],
      rowLimit: 25,
    });
    expect(result).toEqual(expect.objectContaining({ ok: true, data: { rowCount: 1 } }));
    expect(JSON.stringify(result)).not.toContain("access-secret");
  });

  it("maps Google errors to an allowlisted projection", async () => {
    const result = await dispatchGsc({
      operation: { adapterKey: "properties.list", input: {} },
      config: {},
      credentials: { accessToken: "access-secret" },
      signal: new AbortController().signal,
      fetch: async () =>
        new Response(
          JSON.stringify({
            error: {
              status: "PERMISSION_DENIED",
              message: "do not project this provider message",
              details: [{ reason: "ACCESS_TOKEN_SCOPE_INSUFFICIENT", metadata: { token: "x" } }],
            },
          }),
          { status: 403 },
        ),
    });

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: "AUTH_FAILED",
        details: {
          httpStatus: 403,
          providerStatus: "PERMISSION_DENIED",
          reason: "ACCESS_TOKEN_SCOPE_INSUFFICIENT",
        },
      }),
    );
    expect(JSON.stringify(result)).not.toContain("do not project");
    expect(JSON.stringify(result)).not.toContain("access-secret");
  });

  it("uses the fixed URL Inspection endpoint", () => {
    expect(
      planGscRequest(
        {
          adapterKey: "url-inspection.inspect",
          input: { inspectionUrl: "https://example.com/docs" },
        },
        { siteUrl: "https://example.com/" },
      ),
    ).toEqual({
      method: "POST",
      endpoint: "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
    });
  });
});
