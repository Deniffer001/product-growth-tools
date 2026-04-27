/**
 * @input HogQL strings with and without explicit limits
 * @output limit-guard regression coverage for agent query safety
 * @pos provider adapter tests for PostHog query ergonomics
 */

import { describe, expect, test } from "vitest";
import { withLimitGuard } from "./provider";

describe("withLimitGuard", () => {
  test("adds a default limit to unbounded HogQL", () => {
    expect(
      withLimitGuard({ query: "SELECT * FROM events", limit: 50 })
    ).toBe("SELECT * FROM events LIMIT 50");
  });

  test("preserves explicit limits and strips trailing semicolons", () => {
    expect(
      withLimitGuard({ query: "SELECT * FROM events LIMIT 10;" })
    ).toBe("SELECT * FROM events LIMIT 10");
  });

  test("can be disabled for intentional full query bodies", () => {
    expect(
      withLimitGuard({ query: "SELECT count() FROM events", noLimitGuard: true })
    ).toBe("SELECT count() FROM events");
  });
});
