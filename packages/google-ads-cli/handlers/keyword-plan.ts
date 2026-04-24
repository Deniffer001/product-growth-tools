/**
 * @input CLI services plus Keyword Planner request inputs
 * @output raw Keyword Planner ideas and historical metrics datasets
 * @pos Keyword Planner provider-read handlers for Google Ads CLI
 */

import type { CliContext } from "../client";
import { runCliCommand } from "../lib/command-support";
import { cliError } from "../lib/errors";
import {
  parseCommaSeparatedList,
  validateAbsoluteUrl,
  validateCustomerId,
  validateGoogleAdsIds,
  validateKeywordPlanNetwork,
  validateLanguageId,
  validateLimit,
} from "../lib/input-validation";

export type KeywordPlanIdeasInput = {
  customerId?: string;
  keywords?: string;
  pageUrl?: string;
  geoTargetIds?: string;
  languageId?: string;
  network?: string;
  includeAdultKeywords?: boolean;
  limit?: number;
};

export type KeywordPlanHistoricalMetricsInput = {
  customerId?: string;
  keywords: string;
  geoTargetIds?: string;
  languageId?: string;
  network?: string;
  includeAverageCpc?: boolean;
};

function normalizeCommonInput(
  input: {
    customerId?: string;
    geoTargetIds?: string;
    languageId?: string;
    network?: string;
  },
  context: CliContext
) {
  return {
    customerId: validateCustomerId(input.customerId ?? context.customerId),
    geoTargetIds: validateGoogleAdsIds(input.geoTargetIds, "geoTargetIds"),
    languageId: validateLanguageId(input.languageId),
    network: validateKeywordPlanNetwork(input.network),
    loginCustomerId: context.loginCustomerId,
    linkedCustomerId: context.linkedCustomerId,
  };
}

function normalizeIdeasInput(
  input: KeywordPlanIdeasInput,
  context: CliContext
) {
  const keywords = parseCommaSeparatedList(input.keywords, "keywords");
  const pageUrl = validateAbsoluteUrl(input.pageUrl, "pageUrl");

  if (keywords.length === 0 && !pageUrl) {
    throw cliError({
      code: "invalid_input",
      message: "Missing Keyword Planner seed.",
      hint: "Pass --keywords, --page-url, or both.",
    });
  }

  return {
    ...normalizeCommonInput(input, context),
    keywords,
    pageUrl,
    includeAdultKeywords: input.includeAdultKeywords ?? false,
    limit: validateLimit(input.limit) ?? 100,
  };
}

function normalizeHistoricalMetricsInput(
  input: KeywordPlanHistoricalMetricsInput,
  context: CliContext
) {
  return {
    ...normalizeCommonInput(input, context),
    keywords: parseCommaSeparatedList(input.keywords, "keywords"),
    includeAverageCpc: input.includeAverageCpc ?? false,
  };
}

function renderKeywordPlan(data: { customerId: string; rowCount: number }) {
  return [`Customer: ${data.customerId}`, `Rows: ${data.rowCount}`];
}

export async function handleKeywordPlanIdeasDataset(args: {
  input: KeywordPlanIdeasInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const input = normalizeIdeasInput(args.input, services.context);
    const rows = await services.getGoogleAdsClient().generateKeywordIdeas(input);

    services.output.success(
      {
        customerId: input.customerId,
        request: input,
        rowCount: rows.length,
        rows,
      },
      renderKeywordPlan
    );
  });
}

export async function handleKeywordPlanHistoricalMetricsDataset(args: {
  input: KeywordPlanHistoricalMetricsInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const input = normalizeHistoricalMetricsInput(args.input, services.context);
    const rows = await services
      .getGoogleAdsClient()
      .generateKeywordHistoricalMetrics(input);

    services.output.success(
      {
        customerId: input.customerId,
        request: input,
        rowCount: rows.length,
        rows,
      },
      renderKeywordPlan
    );
  });
}
