/**
 * @input keyword planner scalar validation helpers
 * @output coverage for comma-list and constant validation behavior
 * @pos input validation regression coverage for Google Ads CLI
 */

import { describe, expect, test } from "vitest";
import {
  parseCommaSeparatedList,
  validateAbsoluteUrl,
  validateGoogleAdsIds,
  validateKeywordPlanNetwork,
  validateLanguageId,
} from "./lib/input-validation";

describe("google-ads input validation", () => {
  test("parses comma separated keyword lists", () => {
    expect(parseCommaSeparatedList(" ai browser, browser agent ")).toEqual([
      "ai browser",
      "browser agent",
    ]);
  });

  test("validates Google Ads numeric constant ids", () => {
    expect(validateGoogleAdsIds("2840,2124", "geoTargetIds")).toEqual([
      "2840",
      "2124",
    ]);
    expect(() => validateGoogleAdsIds("US", "geoTargetIds")).toThrow(
      "Invalid geoTargetIds"
    );
  });

  test("defaults and validates keyword plan network", () => {
    expect(validateKeywordPlanNetwork()).toBe("GOOGLE_SEARCH");
    expect(validateKeywordPlanNetwork("GOOGLE_SEARCH_AND_PARTNERS")).toBe(
      "GOOGLE_SEARCH_AND_PARTNERS"
    );
    expect(() => validateKeywordPlanNetwork("DISPLAY")).toThrow(
      "Invalid network"
    );
  });

  test("defaults and validates language id", () => {
    expect(validateLanguageId()).toBe("1000");
    expect(validateLanguageId("1017")).toBe("1017");
    expect(() => validateLanguageId("en")).toThrow("Invalid languageId");
  });

  test("normalizes absolute urls", () => {
    expect(validateAbsoluteUrl("https://example.com/path", "pageUrl")).toBe(
      "https://example.com/path"
    );
    expect(() => validateAbsoluteUrl("example.com", "pageUrl")).toThrow(
      "Invalid pageUrl"
    );
  });
});
