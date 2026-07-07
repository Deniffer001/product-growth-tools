/**
 * @input Bing Webmaster client factory, synthetic fetch responses, and env values
 * @output coverage for profile defaults, URL construction, and JSON payload unwrapping
 * @pos client resolution and transport tests for Bing Webmaster CLI
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  buildBingWebmasterUrl,
  createBingWebmasterClientFromApiKey,
} from "./client";
import { createCliContext, loadDefaultCliEnv } from "./context";

describe("bing webmaster client resolution", () => {
  afterEach(() => {
    delete process.env.PRODUCT_GROWTH_PROFILE;
    delete process.env.PRODUCT_GROWTH_PROFILE_DIR;
    delete process.env.PRODUCT_GROWTH_PROFILE_ROOT;
    delete process.env.BING_WEBMASTER_API_KEY;
    delete process.env.BING_WEBMASTER_SITE_URL;
    delete process.env.INIT_CWD;
    vi.restoreAllMocks();
  });

  test("prefers explicit flags over env defaults", () => {
    process.env.BING_WEBMASTER_API_KEY = "env-key";
    process.env.BING_WEBMASTER_SITE_URL = "https://env.example/";

    const context = createCliContext({
      apiKey: "flag-key",
      siteUrl: "https://flag.example/",
    });

    expect(context.apiKey).toBe("flag-key");
    expect(context.siteUrl).toBe("https://flag.example/");
  });

  test("loads business profile env before invocation env files", () => {
    const loadedPaths: string[] = [];
    const root = mkdtempSync(join(tmpdir(), "bing-webmaster-env-"));
    const profiles = mkdtempSync(join(tmpdir(), "product-growth-profiles-"));
    const profileDir = join(profiles, "clonesite-ai");
    process.env.INIT_CWD = root;
    process.env.PRODUCT_GROWTH_PROFILE = "clonesite-ai";
    process.env.PRODUCT_GROWTH_PROFILE_ROOT = profiles;
    mkdirSync(profileDir);
    writeFileSync(
      join(profileDir, ".env"),
      "BING_WEBMASTER_SITE_URL=https://profile.example/\n"
    );
    writeFileSync(
      join(root, ".env.local"),
      "BING_WEBMASTER_SITE_URL=https://local.example/\n"
    );

    loadDefaultCliEnv((input) => {
      loadedPaths.push(input.path);
    });

    expect(loadedPaths).toEqual([
      join(profileDir, ".env"),
      join(root, ".env.local"),
    ]);
    expect(process.env.PRODUCT_GROWTH_PROFILE_DIR).toBe(profileDir);

    rmSync(root, { force: true, recursive: true });
    rmSync(profiles, { force: true, recursive: true });
  });

  test("builds JSON endpoint URLs with Bing string parameter encoding", () => {
    const url = buildBingWebmasterUrl({
      apiKey: "secret",
      baseUrl: "https://ssl.bing.com/webmaster/api.svc/json",
      method: "GetQueryTrafficStats",
      params: {
        siteUrl: "https://example.com/",
        query: { value: "website cloner", encodeAsJsonString: true },
      },
    });

    expect(url.pathname).toBe(
      "/webmaster/api.svc/json/GetQueryTrafficStats"
    );
    expect(url.searchParams.get("apikey")).toBe("secret");
    expect(url.searchParams.get("siteUrl")).toBe("https://example.com/");
    expect(url.searchParams.get("query")).toBe('"website cloner"');
  });

  test("unwraps Bing JSON d payloads", async () => {
    let requestedUrl: string | null = null;
    const fetcher = async (url: Parameters<typeof fetch>[0]) => {
      requestedUrl = String(url);
      return new Response(
        JSON.stringify({ d: [{ Url: "https://example.com/" }] }),
        {
          status: 200,
        }
      );
    };
    const client = createBingWebmasterClientFromApiKey({
      apiKey: "secret",
      fetcher,
      baseUrl: "https://example.test/json",
    });

    await expect(client.getUserSites()).resolves.toEqual([
      { Url: "https://example.com/" },
    ]);
    expect(requestedUrl).toBe("https://example.test/json/GetUserSites?apikey=secret");
  });
});
