/**
 * @input observed event count rows
 * @output namespace map regression coverage
 * @pos keeps event discovery deterministic and agent-friendly
 */

import { describe, expect, test } from "vitest";
import { classifyEventNamespace, summarizeNamespaces } from "./event";

describe("event namespace map", () => {
  test("classifies common event namespaces", () => {
    expect(classifyEventNamespace("$pageview")).toBe("posthog_system");
    expect(classifyEventNamespace("auth.signup")).toBe("auth");
    expect(classifyEventNamespace("onboarding.completed")).toBe("onboarding");
    expect(classifyEventNamespace("purchase.completed")).toBe("purchase");
    expect(classifyEventNamespace("custom_event")).toBe("custom");
  });

  test("summarizes rows by namespace", () => {
    expect(
      summarizeNamespaces([
        ["auth.signup", 10, 8],
        ["auth.signin", 4, 3],
        ["purchase.completed", 2, 2],
        ["$pageview", 100, 50],
      ])
    ).toEqual([
      {
        namespace: "posthog_system",
        eventCount: 1,
        summedEvents: 100,
        summedUsers: 50,
        topEvents: [{ event: "$pageview", events: 100, users: 50 }],
      },
      {
        namespace: "auth",
        eventCount: 2,
        summedEvents: 14,
        summedUsers: 11,
        topEvents: [
          { event: "auth.signup", events: 10, users: 8 },
          { event: "auth.signin", events: 4, users: 3 },
        ],
      },
      {
        namespace: "purchase",
        eventCount: 1,
        summedEvents: 2,
        summedUsers: 2,
        topEvents: [{ event: "purchase.completed", events: 2, users: 2 }],
      },
    ]);
  });
});
