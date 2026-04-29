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
    expect(classifyEventNamespace("alpha.created")).toBe("alpha");
    expect(classifyEventNamespace("beta.completed")).toBe("beta");
    expect(classifyEventNamespace("gamma.completed")).toBe("gamma");
    expect(classifyEventNamespace("custom_event")).toBe("custom");
  });

  test("summarizes rows by namespace", () => {
    expect(
      summarizeNamespaces([
        ["alpha.created", 10, 8],
        ["alpha.updated", 4, 3],
        ["gamma.completed", 2, 2],
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
        namespace: "alpha",
        eventCount: 2,
        summedEvents: 14,
        summedUsers: 11,
        topEvents: [
          { event: "alpha.created", events: 10, users: 8 },
          { event: "alpha.updated", events: 4, users: 3 },
        ],
      },
      {
        namespace: "gamma",
        eventCount: 1,
        summedEvents: 2,
        summedUsers: 2,
        topEvents: [{ event: "gamma.completed", events: 2, users: 2 }],
      },
    ]);
  });
});
