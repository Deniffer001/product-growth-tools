/**
 * @input CLI services plus simple list inputs
 * @output raw PostHog feature flag, insight, and dashboard datasets
 * @pos resource dataset handlers for PostHog provider reads
 */

import type { CliContext } from "../context";
import { runCliCommand } from "../lib/command-support";

type ListInput = {
  limit?: number;
  offset?: number;
  search?: string;
  favorited?: boolean;
  pinned?: boolean;
  raw?: boolean;
};

export async function handleFeatureFlagDatasetFlags(args: {
  input: Record<string, never>;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const flags = await services.getPostHogClient().listFeatureFlags();
    const rows = Array.isArray(flags) ? flags : [];

    services.output.success({ count: rows.length, flags: rows });
  });
}

export async function handleInsightDatasetInsights(args: {
  input: ListInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const insights = await services.getPostHogClient().listInsights(args.input);
    const rows = Array.isArray(insights) ? insights : [];
    const outputRows = args.input.raw ? rows : rows.map(toSlimInsight);

    services.output.success({
      count: outputRows.length,
      raw: args.input.raw === true,
      insights: outputRows,
    });
  });
}

export async function handleDashboardDatasetDashboards(args: {
  input: ListInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const dashboards = await services.getPostHogClient().listDashboards(args.input);
    const rows = Array.isArray(dashboards) ? dashboards : [];

    services.output.success({
      count: rows.length,
      dashboards: rows,
    });
  });
}

function toSlimInsight(input: unknown) {
  if (!input || typeof input !== "object") {
    return input;
  }

  return {
    id: Reflect.get(input, "id") ?? null,
    short_id: Reflect.get(input, "short_id") ?? null,
    name: Reflect.get(input, "name") ?? null,
    description: Reflect.get(input, "description") ?? null,
    query: Reflect.get(input, "query") ?? null,
    url: Reflect.get(input, "url") ?? null,
  };
}
