/**
 * @input output service and classified errors
 * @output coverage for JSON error contract
 * @pos output contract tests for AI Optimization CLI
 */

import { describe, expect, test, vi } from "vitest";
import { cliError } from "./lib/errors";
import { createOutputService } from "./output";

describe("ai-optimization output error contract", () => {
  test("prints JSON errors by default", () => {
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const output = createOutputService({
      pretty: false,
      profile: {
        profileEnvFound: false,
        invocationRoot: "/repo",
        invocationEnvPaths: [],
      },
    });

    output.error(
      cliError({
        code: "auth_error",
        message: "Missing DataForSEO credentials.",
      })
    );

    expect(stderr).toHaveBeenCalledWith(
      expect.stringContaining('"code": "auth_error"')
    );
    stderr.mockRestore();
  });
});
