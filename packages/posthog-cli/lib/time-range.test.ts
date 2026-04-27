/**
 * @input CLI window and absolute date range values
 * @output HogQL timestamp predicate regression coverage
 * @pos keeps rolling and calendar reporting semantics explicit
 */

import { describe, expect, test } from "vitest";
import { resolveTimeRange, windowToInterval } from "./time-range";

describe("time range helpers", () => {
  test("converts compact windows to HogQL intervals", () => {
    expect(windowToInterval("24h")).toBe("INTERVAL 24 HOUR");
    expect(windowToInterval("3d")).toBe("INTERVAL 3 DAY");
    expect(windowToInterval("2w")).toBe("INTERVAL 2 WEEK");
  });

  test("builds rolling window predicates", () => {
    expect(resolveTimeRange({ window: "3d" })).toEqual({
      label: "3d",
      predicate: "timestamp >= now() - INTERVAL 3 DAY",
    });
  });

  test("builds absolute range predicates", () => {
    expect(resolveTimeRange({ from: "2026-04-24", to: "2026-04-27" })).toEqual({
      label: "2026-04-24..2026-04-27",
      predicate:
        "timestamp >= toDateTime('2026-04-24') AND timestamp < toDateTime('2026-04-27')",
    });
  });

  test("rejects ambiguous time ranges", () => {
    expect(() => resolveTimeRange({ window: "3d", from: "2026-04-24", to: "2026-04-27" })).toThrow(
      "Use either --window or --from/--to"
    );
    expect(() => resolveTimeRange({ from: "2026-04-24" })).toThrow(
      "require both --from and --to"
    );
  });
});
