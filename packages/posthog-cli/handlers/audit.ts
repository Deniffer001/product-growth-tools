/**
 * @input funnel preset or event list plus PostHog metadata and traffic reads
 * @output instrumentation support report for a requested analysis
 * @pos validates whether telemetry can support a funnel before interpreting it
 */

import type { CliContext } from "../context";
import { runCliCommand } from "../lib/command-support";
import { resolveFunnelEvents } from "../lib/funnel-presets";
import { eventInList, parseCsvList } from "../lib/hogql";
import { resolveTimeRange, type TimeRangeInput } from "../lib/time-range";
import { buildFunnelQuery } from "./funnel";

type AuditInstrumentationInput = TimeRangeInput & {
  events?: string;
  preset?: string;
};

type CountRow = [event: string, events: number, users: number];
type FunnelRow = [step: string, users: number];

function renderAudit(data: { ok: boolean; timeRange: string; eventCount: number }) {
  return [
    `Valid: ${data.ok}`,
    `Time Range: ${data.timeRange}`,
    `Events: ${data.eventCount}`,
  ];
}

export async function handleAuditDatasetInstrumentation(args: {
  input: AuditInstrumentationInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const events = resolveFunnelEvents({
      ...args.input,
      context: args.context,
      parseEvents: parseCsvList,
    });
    const timeRange = resolveTimeRange(args.input);
    const client = services.getPostHogClient();

    const [eventDefinitions, countResult, funnelResult] = await Promise.all([
      client.listEventDefinitions({}),
      client.runHogql({
        query: buildCountsQuery(events, timeRange.predicate),
        noLimitGuard: true,
      }),
      client.runHogql({
        query: buildFunnelQuery({ events, timePredicate: timeRange.predicate }),
        noLimitGuard: true,
      }),
    ]);

    const definedEvents = extractEventNames(eventDefinitions);
    const counts = rowsByEvent(Array.isArray(countResult) ? (countResult as CountRow[]) : []);
    const funnelRows = Array.isArray(funnelResult) ? (funnelResult as FunnelRow[]) : [];

    const checks = events.map((event, index) => {
      const observed = counts.get(event);
      const funnelUsers = funnelRows[index]?.[1] ?? 0;
      return {
        event,
        defined: definedEvents.has(event),
        observedEvents: observed?.events ?? 0,
        observedUsers: observed?.users ?? 0,
        funnelUsers,
        status:
          !definedEvents.has(event)
            ? "missing_definition"
            : (observed?.users ?? 0) === 0
              ? "no_observed_traffic"
              : funnelUsers === 0
                ? "funnel_break"
                : "ok",
      };
    });

    const missingDefinitions = checks
      .filter((check) => !check.defined)
      .map((check) => check.event);
    const zeroObserved = checks
      .filter((check) => check.defined && check.observedUsers === 0)
      .map((check) => check.event);
    const funnelBreaks = checks
      .filter((check, index) => index > 0 && check.observedUsers > 0 && check.funnelUsers === 0)
      .map((check) => check.event);
    const reconciliationRequired = events.some((event) =>
      /^(purchase|subscribe_success|paywall|billing)\./.test(event)
    );

    services.output.success(
      {
        ok:
          missingDefinitions.length === 0 &&
          zeroObserved.length === 0 &&
          funnelBreaks.length === 0,
        timeRange: timeRange.label,
        eventCount: events.length,
        events,
        checks,
        missingDefinitions,
        zeroObserved,
        funnelBreaks,
        reconciliation: {
          required: reconciliationRequired,
          reason: reconciliationRequired
            ? "PostHog monetization events are telemetry and should be reconciled with billing/backend truth."
            : null,
        },
      },
      renderAudit
    );
  });
}

function buildCountsQuery(events: string[], timePredicate: string) {
  return [
    "SELECT event, count() AS events, count(DISTINCT person_id) AS users",
    "FROM events",
    `WHERE ${timePredicate} AND event IN (${eventInList(events)})`,
    "GROUP BY event",
    "ORDER BY users DESC, events DESC",
  ].join(" ");
}

function extractEventNames(input: unknown) {
  const names = new Set<string>();
  if (!Array.isArray(input)) {
    return names;
  }

  for (const item of input) {
    const name = readEventName(item);
    if (name) {
      names.add(name);
    }
  }

  return names;
}

function readEventName(input: unknown) {
  if (!input || typeof input !== "object") {
    return null;
  }

  for (const key of ["name", "event", "key"]) {
    const value = Reflect.get(input, key);
    if (typeof value === "string") {
      return value;
    }
  }

  return null;
}

function rowsByEvent(rows: CountRow[]) {
  return new Map(
    rows.map(([event, events, users]) => [event, { events, users }] as const)
  );
}
