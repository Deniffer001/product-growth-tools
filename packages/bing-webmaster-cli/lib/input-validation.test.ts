/**
 * @input raw provider-like input values
 * @output coverage for shared input validation helpers
 * @pos validation contract tests for Bing Webmaster CLI
 */

import { describe, expect, test } from "vitest";
import {
  validateAbsoluteUrl,
  validateBingUrlTarget,
  validatePage,
  validateSiteUrl,
} from "./input-validation";

describe("bing webmaster input validation", () => {
  test("accepts valid provider URL inputs", () => {
    expect(validateSiteUrl("https://example.com/")).toBe(
      "https://example.com/"
    );
    expect(validateAbsoluteUrl("https://example.com/sitemap.xml", "feedUrl"))
      .toBe("https://example.com/sitemap.xml");
    expect(validateBingUrlTarget("domain:example.com", "url")).toBe(
      "domain:example.com"
    );
  });

  test("rejects Search Console domain properties for Bing site URLs", () => {
    expect(() => validateSiteUrl("sc-domain:example.com")).toThrow(
      "Invalid siteUrl"
    );
  });

  test("validates page bounds", () => {
    expect(validatePage(undefined)).toBe(0);
    expect(validatePage(32767)).toBe(32767);
    expect(() => validatePage(-1)).toThrow("Invalid page: -1");
  });
});
