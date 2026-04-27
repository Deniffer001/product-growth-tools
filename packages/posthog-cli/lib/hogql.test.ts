/**
 * @input event names, compact windows, and CLI list strings
 * @output HogQL helper regression coverage
 * @pos protects generated analytics queries from malformed fragments
 */

import { describe, expect, test } from "vitest";
import { eventInList, parseCsvList, quoteHogqlString } from "./hogql";

describe("hogql helpers", () => {
  test("parses compact CSV event lists", () => {
    expect(parseCsvList(" auth.signup, onboarding.started ,, purchase.completed ")).toEqual([
      "auth.signup",
      "onboarding.started",
      "purchase.completed",
    ]);
  });

  test("escapes HogQL string literals", () => {
    expect(quoteHogqlString("one'two")).toBe("'one\\'two'");
  });

  test("builds event IN fragments", () => {
    expect(eventInList(["auth.signup", "purchase.completed"])).toBe(
      "'auth.signup','purchase.completed'"
    );
  });
});
