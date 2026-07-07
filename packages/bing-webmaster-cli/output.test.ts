/**
 * @input output service and synthetic CLI errors
 * @output regression coverage for JSON and pretty error rendering
 * @pos output contract tests for Bing Webmaster CLI
 */

import { afterEach, describe, expect, test, vi } from "vitest";
import { cliError } from "./lib/errors";
import { createOutputService } from "./output";

describe("bing webmaster cli output error contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("json mode emits error code and hint", () => {
    const stderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const output = createOutputService({ pretty: false });

    output.error(
      cliError({
        code: "invalid_input",
        message: "Missing Bing Webmaster site URL.",
        hint: "Pass --site-url <url> or set BING_WEBMASTER_SITE_URL.",
      })
    );

    expect(stderr).toHaveBeenCalledWith(
      `${JSON.stringify(
        {
          ok: false,
          error: {
            code: "invalid_input",
            message: "Missing Bing Webmaster site URL.",
            hint: "Pass --site-url <url> or set BING_WEBMASTER_SITE_URL.",
          },
        },
        null,
        2
      )}\n`
    );
  });

  test("pretty mode renders mapped provider errors", () => {
    const stderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const output = createOutputService({ pretty: true });

    output.error(
      cliError({
        code: "provider_failure",
        message: "Request failed",
      })
    );

    expect(stderr).toHaveBeenCalledWith(
      "Error [provider_failure]: Request failed\n"
    );
  });
});
