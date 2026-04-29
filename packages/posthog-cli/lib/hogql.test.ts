/**
 * @input event names, compact windows, and CLI list strings
 * @output HogQL helper regression coverage
 * @pos protects generated analytics queries from malformed fragments
 */

import { describe, expect, test } from "vitest";
import { eventInList, parseCsvList, quoteHogqlString } from "./hogql";

describe("hogql helpers", () => {
  test("parses compact CSV event lists", () => {
    expect(parseCsvList(" event.one, event.two ,, event.three ")).toEqual([
      "event.one",
      "event.two",
      "event.three",
    ]);
  });

  test("escapes HogQL string literals", () => {
    expect(quoteHogqlString("one'two")).toBe("'one\\'two'");
  });

  test("builds event IN fragments", () => {
    expect(eventInList(["event.one", "event.two"])).toBe(
      "'event.one','event.two'"
    );
  });
});
