/**
 * @input CLI services plus one HogQL query request
 * @output raw PostHog HogQL query dataset
 * @pos query dataset handler for PostHog reads
 */

import type { CliContext } from "../context";
import { runCliCommand } from "../lib/command-support";
import type { QueryRunRequest } from "../provider";
import { withLimitGuard } from "../provider";

function renderQuery(data: { rowCount: number; query?: string }) {
  return [`Rows: ${data.rowCount}`, ...(data.query ? [`Query: ${data.query}`] : [])];
}

export async function handleQueryDatasetResults(args: {
  input: QueryRunRequest;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const query = withLimitGuard(args.input);
    const result = await services.getPostHogClient().runHogql({
      ...args.input,
      query,
      noLimitGuard: true,
    });
    const rows = Array.isArray(result) ? result : [];

    services.output.success(
      {
        rowCount: rows.length,
        rows,
        ...(args.input.raw ? { query, raw: result } : {}),
      },
      renderQuery
    );
  });
}
