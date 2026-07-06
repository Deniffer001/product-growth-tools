/**
 * @input CLI services plus domain-level backlink dataset requests
 * @output normalized DataForSEO domain backlink datasets
 * @pos domain dataset handlers for backlink provider reads
 */

import type { CliContext } from "../context";
import {
  validateBacklinksStatusType,
  validateDomainTarget,
  validateInternalListLimit,
  validateLimit,
  validateOffset,
  validateOrderBy,
} from "../lib/input-validation";
import { runCliCommand } from "../lib/command-support";

export type DomainSummaryInput = {
  target: string;
  includeSubdomains?: boolean;
  internalListLimit?: number;
  backlinksStatusType?: string;
};

export type DomainListInput = {
  target: string;
  limit?: number;
  offset?: number;
  orderBy?: string;
  excludeInternalBacklinks?: boolean;
  backlinksStatusType?: string;
};

function normalizeSummaryInput(input: DomainSummaryInput) {
  return {
    target: validateDomainTarget(input.target),
    includeSubdomains: input.includeSubdomains ?? true,
    internalListLimit: validateInternalListLimit(input.internalListLimit),
    backlinksStatusType: validateBacklinksStatusType(input.backlinksStatusType),
  };
}

function normalizeListInput(input: DomainListInput) {
  return {
    target: validateDomainTarget(input.target),
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

export async function handleDomainDatasetSummary(args: {
  input: DomainSummaryInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const dataset = await services
      .getBacklinkClient()
      .summary(normalizeSummaryInput(args.input));

    services.output.success(dataset, renderDataset);
  });
}

export async function handleDomainDatasetReferringDomains(args: {
  input: DomainListInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const dataset = await services
      .getBacklinkClient()
      .referringDomains(normalizeListInput(args.input));

    services.output.success(dataset, renderDataset);
  });
}

export async function handleDomainDatasetAnchors(args: {
  input: DomainListInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const dataset = await services
      .getBacklinkClient()
      .anchors(normalizeListInput(args.input));

    services.output.success(dataset, renderDataset);
  });
}
