/**
 * @input ordered event list and time range
 * @output generated PostHog signup-style funnel dataset
 * @pos common agent analysis path without hand-writing long HogQL
 */

import type { CliContext } from "../context";
import { runCliCommand } from "../lib/command-support";
import { resolveFunnelEvents } from "../lib/funnel-presets";
import { eventInList, parseCsvList } from "../lib/hogql";
import { resolveTimeRange, type TimeRangeInput } from "../lib/time-range";

type FunnelAnalyzeRequest = TimeRangeInput & {
  events?: string;
  preset?: string;
};

type FunnelRawRow = [step: string, users: number];

type FunnelRow = {
  step: string;
  users: number;
  stepConversion: number | null;
  overallConversion: number | null;
  dropoffFromPrevious: number | null;
};

function renderFunnel(data: { timeRange: string; totalUsers: number; rows: FunnelRow[] }) {
  return [
    `Time Range: ${data.timeRange}`,
    `Users: ${data.totalUsers}`,
    ...data.rows.map((row) => `${row.step}: ${row.users}`),
  ];
}

export async function handleFunnelAnalyze(args: {
  input: FunnelAnalyzeRequest;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const events = resolveFunnelEvents({
      ...args.input,
      context: args.context,
      parseEvents: parseCsvList,
    });
    const timeRange = resolveTimeRange(args.input);
    const query = buildFunnelQuery({ events, timePredicate: timeRange.predicate });

    const result = await services.getPostHogClient().runHogql({
      query,
      noLimitGuard: true,
    });
    const rawRows = Array.isArray(result) ? (result as FunnelRawRow[]) : [];
    const rows = enrichFunnelRows(rawRows);

    services.output.success(
      {
        timeRange: timeRange.label,
        events,
        totalUsers: rows[0]?.users ?? 0,
        columns: [
          "step",
          "users",
          "stepConversion",
          "overallConversion",
          "dropoffFromPrevious",
        ],
        rows,
      },
      renderFunnel
    );
  });
}

export function buildFunnelQuery(input: { events: string[]; timePredicate: string }) {
  eventInList(input.events);

  const selectAliases = input.events.map(
    (event, index) => `minIf(timestamp, event = ${eventInList([event])}) AS step_${index}`
  );
  const selectStatements = input.events.map(
    (event, index) =>
      `SELECT ${index} AS sort, ${eventInList([event])} AS step, countIf(step_${index} > toDateTime(0)${
        index === 0 ? "" : ` AND ${previousStepPredicates(index)}`
      }) AS users FROM user_steps`
  );

  return [
    "WITH user_steps AS (",
    `SELECT person_id, ${selectAliases.join(", ")}`,
    "FROM events",
    `WHERE ${input.timePredicate} AND event IN (${eventInList(input.events)})`,
    "GROUP BY person_id",
    ")",
    "SELECT step, users FROM (",
    selectStatements.join(" UNION ALL "),
    ") ORDER BY sort",
  ].join(" ");
}

function previousStepPredicates(index: number) {
  const previousStepPresence = Array.from(
    { length: index },
    (_, previousIndex) => `step_${previousIndex} > toDateTime(0)`
  );
  const orderedTransitions = Array.from({ length: index }, (_, previousIndex) => {
    const current = `step_${previousIndex + 1}`;
    const previous = `step_${previousIndex}`;
    return `${current} >= ${previous}`;
  });

  return [...previousStepPresence, ...orderedTransitions].join(" AND ");
}

function enrichFunnelRows(rawRows: FunnelRawRow[]) {
  const total = rawRows[0]?.[1] ?? 0;

  return rawRows.map(([step, users], index): FunnelRow => {
    const previousUsers = index > 0 ? rawRows[index - 1]?.[1] ?? 0 : null;
    return {
      step,
      users,
      stepConversion:
        previousUsers === null ? null : previousUsers > 0 ? round(users / previousUsers) : 0,
      overallConversion: total > 0 ? round(users / total) : 0,
      dropoffFromPrevious:
        previousUsers === null ? null : previousUsers > 0 ? round(1 - users / previousUsers) : 0,
    };
  });
}

function round(value: number) {
  return Math.round(value * 10000) / 10000;
}
