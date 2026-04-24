/**
 * @input JSONL query file plus shared SERP request defaults
 * @output per-query normalized SERP snapshots and per-row errors
 * @pos batch dataset handler for SERP snapshot reads
 */

import { readFileSync } from "node:fs";
import type { CliContext } from "../context";
import { runCliCommand } from "../lib/command-support";
import { normalizeCliError } from "../lib/errors";
import { validateInputFile } from "../lib/input-validation";
import { normalizeQueryInput, type QueryResultsInput } from "./query";

export type BatchResultsInput = {
  inputFile: string;
  country?: string;
  language?: string;
  device?: string;
  os?: string;
  depth?: number;
};

type BatchRow =
  | string
  | {
      query?: string;
      country?: string;
      language?: string;
      device?: string;
      os?: string;
      depth?: number;
    };

function parseJsonl(path: string): BatchRow[] {
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as BatchRow;
      } catch {
        return line;
      }
    });
}

function toQueryInput(row: BatchRow, input: BatchResultsInput): QueryResultsInput {
  if (typeof row === "string") {
    return {
      ...input,
      query: row,
    };
  }

  return {
    query: row.query ?? "",
    country: row.country ?? input.country,
    language: row.language ?? input.language,
    device: row.device ?? input.device,
    os: row.os ?? input.os,
    depth: row.depth ?? input.depth,
  };
}

function renderBatch(data: { count: number; errorCount: number }) {
  return [`Snapshots: ${data.count}`, `Errors: ${data.errorCount}`];
}

export async function handleBatchDatasetResults(args: {
  input: BatchResultsInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const inputFile = validateInputFile(args.input.inputFile);
    const rows = parseJsonl(inputFile);
    const client = services.getSerpSnapshotClient();
    const snapshots = [];
    const errors = [];

    for (const [index, row] of rows.entries()) {
      try {
        const input = normalizeQueryInput(
          toQueryInput(row, args.input),
          services.context
        );
        snapshots.push(await client.query(input));
      } catch (error) {
        const resolved = normalizeCliError(error);
        errors.push({
          index,
          query: typeof row === "string" ? row : row.query ?? null,
          error: {
            code: resolved.code,
            message: resolved.message,
            ...(resolved.hint ? { hint: resolved.hint } : {}),
          },
        });
      }
    }

    services.output.success(
      {
        inputFile,
        count: snapshots.length,
        errorCount: errors.length,
        snapshots,
        errors,
      },
      renderBatch
    );
  });
}
