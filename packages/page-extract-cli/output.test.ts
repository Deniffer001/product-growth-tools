/**
 * @input output service and synthetic CLI errors
 * @output regression coverage for JSON and pretty error rendering
 * @pos output contract tests for page-extract CLI
 */

import { afterEach, describe, expect, test, vi } from "vitest";
import { cliError } from "./lib/errors";
import { createOutputService } from "./output";

describe("page-extract output error contract", () => {
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
        message: "Invalid url.",
        hint: "Pass --url <https-url>.",
      })
    );

    expect(stderr).toHaveBeenCalledWith(
      `${JSON.stringify(
        {
          ok: false,
          error: {
            code: "invalid_input",
            message: "Invalid url.",
            hint: "Pass --url <https-url>.",
          },
        },
        null,
        2
      )}\n`
    );
  });
});
