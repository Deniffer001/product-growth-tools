/**
 * @input synthetic provider errors
 * @output coverage for Bing Webmaster error classification
 * @pos error contract tests for Bing Webmaster CLI
 */

import { describe, expect, test } from "vitest";
import {
  BingWebmasterProviderError,
  normalizeCliError,
} from "./errors";

describe("bing webmaster error normalization", () => {
  test("maps invalid API key responses to provider_auth", () => {
    const resolved = normalizeCliError(
      new BingWebmasterProviderError("InvalidApiKey", {
        status: 400,
        providerCode: 3,
        providerMessage: "InvalidApiKey",
      })
    );

    expect(resolved.code).toBe("provider_auth");
  });

  test("maps rate limit responses to provider_rate_limited", () => {
    const resolved = normalizeCliError(
      new BingWebmasterProviderError("Too many requests", { status: 429 })
    );

    expect(resolved.code).toBe("provider_rate_limited");
  });

  test("maps provider bad requests to invalid_input", () => {
    const resolved = normalizeCliError(
      new BingWebmasterProviderError("Bad request", { status: 400 })
    );

    expect(resolved.code).toBe("invalid_input");
  });
});
