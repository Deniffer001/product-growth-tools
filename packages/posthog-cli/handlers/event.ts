/**
 * @input PostHog services plus event count request parameters
 * @output compact event-count dataset for discovery and funnel planning
 * @pos agent-friendly event map over actual observed PostHog traffic
 */

import type { CliContext } from "../context";
import { runCliCommand } from "../lib/command-support";
import { eventInList, parseCsvList, quoteHogqlString } from "../lib/hogql";
import { resolveTimeRange, type TimeRangeInput } from "../lib/time-range";

type EventCountsRequest = TimeRangeInput & {
  limit?: number;
  events?: string;
  q?: string;
};

type EventCountRow = [event: string, events: number, users: number];
type EventNamespaceSummary = {
  namespace: string;
  eventCount: number;
  summedEvents: number;
  summedUsers: number;
  topEvents: Array<{ event: string; events: number; users: number }>;
};

function renderEventCounts(data: { timeRange: string; rowCount: number }) {
  return [`Time Range: ${data.timeRange}`, `Rows: ${data.rowCount}`];
}

export async function handleEventDatasetCounts(args: {
  input: EventCountsRequest;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const limit = args.input.limit ?? 200;
    const timeRange = resolveTimeRange(args.input);
    const result = await services.getPostHogClient().runHogql({
      query: buildEventCountsQuery(args.input),
      limit,
    });
    const rows = Array.isArray(result) ? (result as EventCountRow[]) : [];

    services.output.success(
      {
        timeRange: timeRange.label,
        rowCount: rows.length,
        columns: ["event", "events", "users"],
        rows,
      },
      renderEventCounts
    );
  });
}

export async function handleEventDatasetMap(args: {
  input: EventCountsRequest;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const limit = args.input.limit ?? 500;
    const timeRange = resolveTimeRange(args.input);
    const result = await services.getPostHogClient().runHogql({
      query: buildEventCountsQuery(args.input),
      limit,
    });
    const rows = Array.isArray(result) ? (result as EventCountRow[]) : [];

    services.output.success(
      {
        timeRange: timeRange.label,
        eventCount: rows.length,
        note: "Namespace summedUsers is the sum of per-event distinct users; use it for discovery ranking, not as a namespace-level unique user count.",
        namespaces: summarizeNamespaces(rows),
      },
      (data) => [`Time Range: ${data.timeRange}`, `Events: ${data.eventCount}`]
    );
  });
}

export function buildEventCountsQuery(input: EventCountsRequest) {
  const timeRange = resolveTimeRange(input);
  const filters = [timeRange.predicate];

  if (input.events) {
    filters.push(`event IN (${eventInList(parseCsvList(input.events))})`);
  }

  if (input.q) {
    filters.push(`event ILIKE ${quoteHogqlString(`%${input.q}%`)}`);
  }

  return [
    "SELECT event, count() AS events, count(DISTINCT person_id) AS users",
    "FROM events",
    `WHERE ${filters.join(" AND ")}`,
    "GROUP BY event",
    "ORDER BY users DESC, events DESC",
  ].join(" ");
}

export function classifyEventNamespace(event: string) {
  if (event.startsWith("$")) {
    return "posthog_system";
  }

  const [prefix] = event.split(".");
  if (!prefix || prefix === event) {
    return "custom";
  }

  return prefix;
}

export function summarizeNamespaces(rows: EventCountRow[]) {
  const byNamespace = new Map<string, EventNamespaceSummary>();

  for (const [event, events, users] of rows) {
    const namespace = classifyEventNamespace(event);
    const summary =
      byNamespace.get(namespace) ??
      {
        namespace,
        eventCount: 0,
        summedEvents: 0,
        summedUsers: 0,
        topEvents: [],
      };

    summary.eventCount += 1;
    summary.summedEvents += events;
    summary.summedUsers += users;
    summary.topEvents.push({ event, events, users });
    byNamespace.set(namespace, summary);
  }

  return Array.from(byNamespace.values())
    .map((summary) => ({
      ...summary,
      topEvents: summary.topEvents
        .sort((left, right) => right.users - left.users || right.events - left.events)
        .slice(0, 10),
    }))
    .sort(
      (left, right) =>
        right.summedUsers - left.summedUsers ||
        right.summedEvents - left.summedEvents
    );
}
