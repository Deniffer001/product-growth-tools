/**
 * @input argc, valibot, and JSON-schema conversion
 * @output schema-first AI Optimization CLI definition and options
 * @pos discoverable agent-friendly contract for LLM response and mention data
 */

import { toStandardJsonSchema } from "@valibot/to-json-schema";
import { c, group } from "argc";
import {
  boolean,
  literal,
  number,
  object,
  optional,
  pipe,
  string,
  transform,
  union,
} from "valibot";

const s = toStandardJsonSchema;
const cliName = "ai-optimization";

const cliNumberSchema = pipe(
  string(),
  transform((value) => Number(value)),
  number()
);

const flexibleNumberSchema = union([number(), cliNumberSchema]);

const llmResponseProviderSchema = union([
  literal("chat_gpt"),
  literal("claude"),
  literal("gemini"),
  literal("perplexity"),
]);

const mentionTargetInputSchema = {
  domain: optional(string()),
  keyword: optional(string()),
  targetJson: optional(string()),
  targetsJson: optional(string()),
  aggregationKey: optional(string()),
  includeSubdomains: optional(boolean()),
  matchType: optional(string()),
  searchScope: optional(string()),
  searchFilter: optional(string()),
};

const mentionLocationInputSchema = {
  locationName: optional(string()),
  locationCode: optional(flexibleNumberSchema),
  languageName: optional(string()),
  languageCode: optional(string()),
  platform: optional(string()),
};

const mentionFilterInputSchema = {
  filtersJson: optional(string()),
  initialDatasetFiltersJson: optional(string()),
  orderBy: optional(string()),
  limit: optional(flexibleNumberSchema),
  offset: optional(flexibleNumberSchema),
  searchAfterToken: optional(string()),
  linksScope: optional(string()),
  itemsListLimit: optional(flexibleNumberSchema),
  internalListLimit: optional(flexibleNumberSchema),
  tag: optional(string()),
};

export const globalsSchema = s(
  object({
    dataforseoLogin: optional(string()),
    dataforseoPassword: optional(string()),
    locationCode: optional(flexibleNumberSchema),
    languageCode: optional(string()),
    pretty: optional(boolean()),
  })
);

export const schema = {
  doctor: group(
    { description: "Runtime diagnostics" },
    {
      dataset: group(
        { description: "Read local readiness datasets" },
        {
          readiness: c
            .meta({
              description:
                "Inspect whether local DataForSEO credentials are ready for AI Optimization calls",
              examples: ["ai-optimization doctor dataset readiness --pretty"],
            })
            .input(s(object({}))),
        }
      ),
    }
  ),
  llmResponse: group(
    { description: "LLM response APIs" },
    {
      dataset: group(
        { description: "Read LLM response metadata datasets" },
        {
          models: c
            .meta({
              description:
                "Fetch available DataForSEO LLM response models for a provider",
              examples: [
                "ai-optimization llmResponse dataset models --provider chat_gpt",
              ],
            })
            .input(
              s(
                object({
                  provider: optional(llmResponseProviderSchema),
                })
              )
            ),
        }
      ),
      entity: group(
        { description: "Fetch one LLM response entity" },
        {
          live: c
            .meta({
              description:
                "Request one live LLM response from ChatGPT, Claude, Gemini, or Perplexity through DataForSEO",
              examples: [
                'ai-optimization llmResponse entity live --provider chat_gpt --model-name gpt-4.1-mini --prompt "Name three website cloning tools"',
              ],
            })
            .input(
              s(
                object({
                  provider: optional(llmResponseProviderSchema),
                  prompt: string(),
                  modelName: string(),
                  maxOutputTokens: optional(flexibleNumberSchema),
                  temperature: optional(flexibleNumberSchema),
                  topP: optional(flexibleNumberSchema),
                  webSearch: optional(boolean()),
                  forceWebSearch: optional(boolean()),
                  webSearchCountryIsoCode: optional(string()),
                  webSearchCity: optional(string()),
                  systemMessage: optional(string()),
                  messageChainJson: optional(string()),
                  useReasoning: optional(boolean()),
                  tag: optional(string()),
                })
              )
            ),
        }
      ),
    }
  ),
  llmMention: group(
    { description: "LLM mention APIs" },
    {
      dataset: group(
        { description: "Read LLM mention datasets" },
        {
          locationsAndLanguages: c
            .meta({
              description:
                "Fetch DataForSEO LLM Mentions locations and languages metadata",
              examples: [
                "ai-optimization llmMention dataset locationsAndLanguages",
              ],
            })
            .input(s(object({}))),
          availableFilters: c
            .meta({
              description:
                "Fetch DataForSEO LLM Mentions available filters metadata",
              examples: ["ai-optimization llmMention dataset availableFilters"],
            })
            .input(s(object({}))),
          search: c
            .meta({
              description:
                "Search raw LLM mention rows by domain or keyword target",
              examples: [
                "ai-optimization llmMention dataset search --domain clonesite.ai --platform google --limit 5",
              ],
            })
            .input(
              s(
                object({
                  ...mentionTargetInputSchema,
                  ...mentionLocationInputSchema,
                  ...mentionFilterInputSchema,
                })
              )
            ),
          topPages: c
            .meta({
              description:
                "Aggregate LLM mentions by top source or search-result pages",
              examples: [
                'ai-optimization llmMention dataset topPages --keyword "website cloner" --platform google --items-list-limit 5',
              ],
            })
            .input(
              s(
                object({
                  ...mentionTargetInputSchema,
                  ...mentionLocationInputSchema,
                  ...mentionFilterInputSchema,
                })
              )
            ),
          topDomains: c
            .meta({
              description:
                "Aggregate LLM mentions by top source or search-result domains",
              examples: [
                'ai-optimization llmMention dataset topDomains --keyword "website cloner" --platform google',
              ],
            })
            .input(
              s(
                object({
                  ...mentionTargetInputSchema,
                  ...mentionLocationInputSchema,
                  ...mentionFilterInputSchema,
                })
              )
            ),
          aggregatedMetrics: c
            .meta({
              description:
                "Fetch aggregated LLM mention metrics for one target group",
              examples: [
                "ai-optimization llmMention dataset aggregatedMetrics --domain clonesite.ai --platform google",
              ],
            })
            .input(
              s(
                object({
                  ...mentionTargetInputSchema,
                  ...mentionLocationInputSchema,
                  ...mentionFilterInputSchema,
                })
              )
            ),
          crossAggregatedMetrics: c
            .meta({
              description:
                "Fetch cross-aggregated LLM mention metrics across named target groups",
              examples: [
                'ai-optimization llmMention dataset crossAggregatedMetrics --targets-json \'[{"aggregationKey":"clonesite","target":[{"domain":"clonesite.ai"}]}]\' --platform google',
              ],
            })
            .input(
              s(
                object({
                  ...mentionTargetInputSchema,
                  ...mentionLocationInputSchema,
                  ...mentionFilterInputSchema,
                })
              )
            ),
        }
      ),
    }
  ),
};

export const cliOptions = {
  name: cliName,
  version: "0.1.0",
  description: "Agent-friendly DataForSEO AI Optimization CLI",
  globals: globalsSchema,
  schemaMaxLines: 32,
};
