/**
 * @input CLI services plus page-level backlink dataset requests
 * @output normalized DataForSEO page backlink datasets
 * @pos page dataset handlers for backlink provider reads
 */

import type { CliContext } from "../context";
import {
  validateBacklinksStatusType,
  validateInternalListLimit,
  validateLimit,
  validateOffset,
  validateOrderBy,
  validatePageTarget,
} from "../lib/input-validation";
import { runCliCommand } from "../lib/command-support";

export type PageSummaryInput = {
  target: string;
  includeSubdomains?: boolean;
  internalListLimit?: number;
  backlinksStatusType?: string;
};

export type PageListInput = {
  target: string;
  limit?: number;
  offset?: number;
  orderBy?: string;
  excludeInternalBacklinks?: boolean;
  backlinksStatusType?: string;
};

function normalizeSummaryInput(input: PageSummaryInput) {
  return {
    target: validatePageTarget(input.target),
    includeSubdomains: input.includeSubdomains ?? false,
    internalListLimit: validateInternalListLimit(input.internalListLimit),
    backlinksStatusType: validateBacklinksStatusType(input.backlinksStatusType),
  };
}

function normalizeListInput(input: PageListInput) {
  return {
    target: validatePageTarget(input.target),
    limit: validateLimit(input.limit),
    offset: validateOffset(input.offset),
    orderBy: validateOrderBy(input.orderBy),
    excludeInternalBacklinks: input.excludeInternalBacklinks ?? true,
    backlinksStatusType: validateBacklinksStatusType(input.backlinksStatusType),
  };
}

function renderDataset(data: {
  target: string;
  dataset: string;
  resultCount: number;
  billing?: { cost: number | null; currency: string };
}) {
  return [
    `Target: ${data.target}`,
    `Dataset: ${data.dataset}`,
    `Results: ${data.resultCount}`,
    `Cost: ${formatCost(data.billing)}`,
  ];
}

function formatCost(billing?: { cost: number | null; currency: string }) {
  if (!billing || billing.cost === null) {
    return "unknown";
  }

  return `${billing.cost} ${billing.currency}`;
}

export async function handlePageDatasetSummary(args: {
  input: PageSummaryInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const dataset = await services
      .getBacklinkClient()
      .summary(normalizeSummaryInput(args.input));

    services.output.success(dataset, renderDataset);
  });
}

export async function handlePageDatasetBacklinks(args: {
  input: PageListInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const dataset = await services
      .getBacklinkClient()
      .backlinks(normalizeListInput(args.input));

    services.output.success(dataset, renderDataset);
  });
}

export async function handlePageDatasetAnchors(args: {
  input: PageListInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const dataset = await services
      .getBacklinkClient()
      .anchors(normalizeListInput(args.input));

    services.output.success(dataset, renderDataset);
  });
}
