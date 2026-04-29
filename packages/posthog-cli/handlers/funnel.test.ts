/**
 * @input ordered event lists
 * @output generated funnel HogQL regression coverage
 * @pos keeps the agent-facing funnel command stable
 */

import { describe, expect, test } from "vitest";
import { buildFunnelQuery } from "./funnel";

describe("buildFunnelQuery", () => {
  test("generates one row per funnel step with ordering predicates", () => {
    const query = buildFunnelQuery({
      events: ["event.one", "event.two", "event.three"],
      timePredicate: "timestamp >= now() - INTERVAL 3 DAY",
    });

    expect(query).toContain("timestamp >= now() - INTERVAL 3 DAY");
    expect(query).toContain("event IN ('event.one','event.two','event.three')");
    expect(query).toContain("SELECT 0 AS sort, 'event.one' AS step");
    expect(query).toContain("SELECT 1 AS sort, 'event.two' AS step");
    expect(query).toContain("SELECT 2 AS sort, 'event.three' AS step");
    expect(query).toContain("ORDER BY sort");
    expect(query).toContain("step_0 > toDateTime(0)");
    expect(query).toContain("step_1 > toDateTime(0)");
    expect(query).toContain("step_1 >= step_0");
    expect(query).toContain("step_2 >= step_1");
  });

  test("requires at least one event", () => {
    expect(() =>
      buildFunnelQuery({ events: [], timePredicate: "timestamp >= now() - INTERVAL 3 DAY" })
    ).toThrow("At least one event is required");
  });
});
