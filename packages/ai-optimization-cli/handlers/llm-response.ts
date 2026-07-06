/**
 * @input CLI services plus DataForSEO LLM response command inputs
 * @output normalized LLM response metadata and live response datasets
 * @pos LLM response handler boundary for DataForSEO AI Optimization
 */

import type { CliContext } from "../context";
import { cliError } from "../lib/errors";
import { runCliCommand } from "../lib/command-support";
import type {
  LlmMessage,
  LlmResponseLiveRequest,
  LlmResponseProvider,
} from "../provider";

export type LlmResponseModelsInput = {
  provider?: LlmResponseProvider;
};

export type LlmResponseLiveInput = {
  provider?: LlmResponseProvider;
  prompt: string;
  modelName: string;
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
  webSearch?: boolean;
  forceWebSearch?: boolean;
  webSearchCountryIsoCode?: string;
  webSearchCity?: string;
  systemMessage?: string;
  messageChainJson?: string;
  useReasoning?: boolean;
  tag?: string;
};

const DEFAULT_RESPONSE_PROVIDER: LlmResponseProvider = "chat_gpt";

function renderModels(data: {
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

function renderLiveResponse(data: {
  llmProvider: string;
  modelName: string | null;
  outputTokens: number | null;
  billing?: { cost: number | null; currency: string; modelCost?: number | null };
}) {
  return [
    `Provider: ${data.llmProvider}`,
    `Model: ${data.modelName ?? "unknown"}`,
    `Output tokens: ${data.outputTokens ?? "unknown"}`,
    `Cost: ${formatCost(data.billing)}`,
    `Model cost: ${formatModelCost(data.billing)}`,
  ];
}

function formatCost(billing?: { cost: number | null; currency: string }) {
  if (!billing || billing.cost === null) {
    return "unknown";
  }

  return `${billing.cost} ${billing.currency}`;
}

function formatModelCost(input?: {
  modelCost?: number | null;
  currency: string;
}) {
  if (!input || input.modelCost === null || input.modelCost === undefined) {
    return "unknown";
  }

  return `${input.modelCost} ${input.currency}`;
}

export async function handleLlmResponseDatasetModels(args: {
  input: LlmResponseModelsInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const dataset = await services
      .getAiOptimizationClient()
      .llmResponseModels(args.input.provider ?? DEFAULT_RESPONSE_PROVIDER);

    services.output.success(dataset, renderModels);
  });
}

export async function handleLlmResponseEntityLive(args: {
  input: LlmResponseLiveInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const response = await services
      .getAiOptimizationClient()
      .llmResponseLive(normalizeLiveInput(args.input));

    services.output.success(response, renderLiveResponse);
  });
}

function normalizeLiveInput(input: LlmResponseLiveInput): LlmResponseLiveRequest {
  return {
    provider: input.provider ?? DEFAULT_RESPONSE_PROVIDER,
    prompt: input.prompt,
    modelName: input.modelName,
    maxOutputTokens: input.maxOutputTokens,
    temperature: input.temperature,
    topP: input.topP,
    webSearch: input.webSearch,
    forceWebSearch: input.forceWebSearch,
    webSearchCountryIsoCode: input.webSearchCountryIsoCode,
    webSearchCity: input.webSearchCity,
    systemMessage: input.systemMessage,
    messageChain: parseMessageChain(input.messageChainJson),
    useReasoning: input.useReasoning,
    tag: input.tag,
  };
}

function parseMessageChain(value?: string): LlmMessage[] | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = parseJson(value, "messageChainJson");
  if (!Array.isArray(parsed)) {
    throw cliError({
      code: "invalid_input",
      message: "messageChainJson must be a JSON array.",
    });
  }

  return parsed.map((item, index) => {
    if (!isRecord(item)) {
      throw cliError({
        code: "invalid_input",
        message: `messageChainJson[${index}] must be an object.`,
      });
    }
    if (item.role !== "user" && item.role !== "ai") {
      throw cliError({
        code: "invalid_input",
        message: `messageChainJson[${index}].role must be user or ai.`,
      });
    }
    if (typeof item.message !== "string") {
      throw cliError({
        code: "invalid_input",
        message: `messageChainJson[${index}].message must be a string.`,
      });
    }

    return {
      role: item.role,
      message: item.message,
    };
  });
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
