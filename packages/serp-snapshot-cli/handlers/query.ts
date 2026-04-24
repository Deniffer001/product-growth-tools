/**
 * @input CLI services plus a single SERP query request
 * @output normalized Google SERP snapshot dataset
 * @pos query dataset handler for SERP snapshot reads
 */

import type { CliContext } from "../context";
import { runCliCommand } from "../lib/command-support";
import {
  validateCountry,
  validateDepth,
  validateDevice,
  validateLanguage,
  validateOs,
  validateQuery,
} from "../lib/input-validation";

export type QueryResultsInput = {
  query: string;
  country?: string;
  language?: string;
  device?: string;
  os?: string;
  depth?: number;
};

export function normalizeQueryInput(input: QueryResultsInput, context: CliContext) {
  return {
    query: validateQuery(input.query),
    country: validateCountry(input.country ?? context.defaultCountry),
    language: validateLanguage(input.language ?? context.defaultLanguage),
    device: validateDevice(input.device),
    os: validateOs(input.os),
    depth: validateDepth(input.depth),
  };
}

function renderSnapshot(data: { query: string; resultCount: number }) {
  return [`Query: ${data.query}`, `Results: ${data.resultCount}`];
}

export async function handleQueryDatasetResults(args: {
  input: QueryResultsInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const input = normalizeQueryInput(args.input, services.context);
    const snapshot = await services.getSerpSnapshotClient().query(input);

    services.output.success(snapshot, renderSnapshot);
  });
}
