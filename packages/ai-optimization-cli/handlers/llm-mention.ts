/**
 * @input CLI services plus DataForSEO LLM mention command inputs
 * @output normalized LLM mention metadata, search, and aggregate datasets
 * @pos LLM mention handler boundary for DataForSEO AI Optimization
 */

import type { CliContext } from "../context";
import { cliError } from "../lib/errors";
import { runCliCommand } from "../lib/command-support";
import type {
  LlmMentionCrossTarget,
  LlmMentionDatasetKind,
  LlmMentionRequest,
  LlmMentionTarget,
} from "../provider";

export type LlmMentionInput = {
  domain?: string;
  keyword?: string;
  targetJson?: string;
  targetsJson?: string;
  aggregationKey?: string;
  includeSubdomains?: boolean;
  matchType?: string;
  searchScope?: string;
  searchFilter?: string;
  locationName?: string;
  locationCode?: number;
  languageName?: string;
  languageCode?: string;
  platform?: string;
  filtersJson?: string;
  initialDatasetFiltersJson?: string;
  orderBy?: string;
  limit?: number;
  offset?: number;
  searchAfterToken?: string;
  linksScope?: string;
  itemsListLimit?: number;
  internalListLimit?: number;
  tag?: string;
};

function renderMetadata(data: {
  dataset: string;
  resultCount: number;
  billing?: { cost: number | null; currency: string };
}) {
  return [
    `Dataset: ${data.dataset}`,
    `Results: ${data.resultCount}`,
    `Cost: ${formatCost(data.billing)}`,
  ];
}

function renderMention(data: {
  dataset: string;
  itemsCount: number;
  totalCount: number | null;
  billing?: { cost: number | null; currency: string };
}) {
  return [
    `Dataset: ${data.dataset}`,
    `Items: ${data.itemsCount}`,
    `Total: ${data.totalCount ?? "unknown"}`,
    `Cost: ${formatCost(data.billing)}`,
  ];
}

function formatCost(billing?: { cost: number | null; currency: string }) {
  if (!billing || billing.cost === null) {
    return "unknown";
  }

  return `${billing.cost} ${billing.currency}`;
}

export async function handleLlmMentionDatasetLocationsAndLanguages(args: {
  input: Record<string, never>;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const dataset = await services
      .getAiOptimizationClient()
      .llmMentionMetadata("locations_and_languages");

    services.output.success(dataset, renderMetadata);
  });
}

export async function handleLlmMentionDatasetAvailableFilters(args: {
  input: Record<string, never>;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const dataset = await services
      .getAiOptimizationClient()
      .llmMentionMetadata("available_filters");

    services.output.success(dataset, renderMetadata);
  });
}

export function createLlmMentionLiveHandler(dataset: LlmMentionDatasetKind) {
  return async (args: { input: LlmMentionInput; context: CliContext }) => {
    await runCliCommand(args.context, async (services) => {
      const result = await services
        .getAiOptimizationClient()
        .llmMentionLive(dataset, normalizeMentionInput(args.input));

      services.output.success(result, renderMention);
    });
  };
}

function normalizeMentionInput(input: LlmMentionInput): LlmMentionRequest {
  return {
    domain: input.domain,
    keyword: input.keyword,
    target: parseTargetJson(input.targetJson),
    targets: parseTargetsJson(input.targetsJson),
    aggregationKey: input.aggregationKey,
    includeSubdomains: input.includeSubdomains,
    matchType: input.matchType,
    searchScope: parseStringList(input.searchScope),
    searchFilter: input.searchFilter,
    locationName: input.locationName,
    locationCode: input.locationCode,
    languageName: input.languageName,
    languageCode: input.languageCode,
    platform: input.platform,
    filters: parseJsonArray(input.filtersJson, "filtersJson"),
    initialDatasetFilters: parseJsonArray(
      input.initialDatasetFiltersJson,
      "initialDatasetFiltersJson"
    ),
    orderBy: parseStringList(input.orderBy),
    limit: input.limit,
    offset: input.offset,
    searchAfterToken: input.searchAfterToken,
    linksScope: input.linksScope,
    itemsListLimit: input.itemsListLimit,
    internalListLimit: input.internalListLimit,
    tag: input.tag,
  };
}

function parseTargetJson(value?: string): LlmMentionTarget[] | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = parseJson(value, "targetJson");
  if (!Array.isArray(parsed)) {
    throw cliError({
      code: "invalid_input",
      message: "targetJson must be a JSON array.",
    });
  }

  return parsed.map(parseTarget);
}

function parseTargetsJson(value?: string): LlmMentionCrossTarget[] | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = parseJson(value, "targetsJson");
  if (!Array.isArray(parsed)) {
    throw cliError({
      code: "invalid_input",
      message: "targetsJson must be a JSON array.",
    });
  }

  return parsed.map((item, index) => {
    if (!isRecord(item)) {
      throw cliError({
        code: "invalid_input",
        message: `targetsJson[${index}] must be an object.`,
      });
    }
    if (typeof item.aggregationKey !== "string") {
      throw cliError({
        code: "invalid_input",
        message: `targetsJson[${index}].aggregationKey must be a string.`,
      });
    }
    if (!Array.isArray(item.target)) {
      throw cliError({
        code: "invalid_input",
        message: `targetsJson[${index}].target must be an array.`,
      });
    }

    return {
      aggregationKey: item.aggregationKey,
      target: item.target.map(parseTarget),
    };
  });
}

function parseTarget(value: unknown, index: number): LlmMentionTarget {
  if (!isRecord(value)) {
    throw cliError({
      code: "invalid_input",
      message: `target[${index}] must be an object.`,
    });
  }

  return {
    domain: readOptionalString(value.domain, `target[${index}].domain`),
    keyword: readOptionalString(value.keyword, `target[${index}].keyword`),
    includeSubdomains: readOptionalBoolean(
      value.includeSubdomains,
      `target[${index}].includeSubdomains`
    ),
    matchType: readOptionalString(value.matchType, `target[${index}].matchType`),
    searchScope: readOptionalStringArray(
      value.searchScope,
      `target[${index}].searchScope`
    ),
    searchFilter: readOptionalString(
      value.searchFilter,
      `target[${index}].searchFilter`
    ),
  };
}

function parseJsonArray(value: string | undefined, name: string) {
  if (!value) {
    return undefined;
  }

  const parsed = parseJson(value, name);
  if (!Array.isArray(parsed)) {
    throw cliError({
      code: "invalid_input",
      message: `${name} must be a JSON array.`,
    });
  }

  return parsed;
}

function parseStringList(value?: string) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.startsWith("[")) {
    return parseJsonArray(trimmed, "list")?.map((item, index) => {
      if (typeof item !== "string") {
        throw cliError({
          code: "invalid_input",
          message: `list[${index}] must be a string.`,
        });
      }
      return item;
    });
  }

  return trimmed
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseJson(value: string, name: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw cliError({
      code: "invalid_input",
      message: `${name} is not valid JSON: ${message}`,
    });
  }
}

function readOptionalString(value: unknown, path: string) {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "string") {
    return value;
  }
  throw cliError({
    code: "invalid_input",
    message: `${path} must be a string.`,
  });
}

function readOptionalBoolean(value: unknown, path: string) {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "boolean") {
    return value;
  }
  throw cliError({
    code: "invalid_input",
    message: `${path} must be a boolean.`,
  });
}

function readOptionalStringArray(value: unknown, path: string) {
  if (value === undefined) {
    return undefined;
  }
  if (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string")
  ) {
    return value;
  }
  throw cliError({
    code: "invalid_input",
    message: `${path} must be a string array.`,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
