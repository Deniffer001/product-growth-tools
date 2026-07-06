#!/usr/bin/env bun
/**
 * @input process argv, argc schema, and AI Optimization handlers
 * @output argc-powered AI Optimization CLI runtime
 * @pos provider-adjacent CLI entry point for SEO and GEO agent consumers
 */

import {
  cli,
  generateSchema,
  generateSchemaOutline,
  selectSchema,
} from "argc";
import {
  createCliContext,
  loadDefaultCliEnv,
  shouldLoadDefaultCliEnv,
} from "./context";
import { handleDoctorDatasetReadiness } from "./handlers/doctor";
import {
  createLlmMentionLiveHandler,
  handleLlmMentionDatasetAvailableFilters,
  handleLlmMentionDatasetLocationsAndLanguages,
} from "./handlers/llm-mention";
import {
  handleLlmResponseDatasetModels,
  handleLlmResponseEntityLive,
} from "./handlers/llm-response";
import {
  createArgcOptions,
  normalizeLegacyArgv,
  withLegacyContext,
} from "./lib/argc-compat";
import { cliOptions, schema } from "./schema";

const parsedArgv = normalizeLegacyArgv({
  argv: process.argv.slice(2),
  schema,
  globalFlags: [
    "dataforseoLogin",
    "dataforseoPassword",
    "locationCode",
    "languageCode",
    "pretty",
  ],
});

if (shouldLoadDefaultCliEnv({ flags: parsedArgv.flags })) {
  loadDefaultCliEnv();
}

function printSchema(text: string) {
  for (const line of text.split("\n")) {
    console.log(line);
  }
}

function maybeHandleExpandedSchemaSelector() {
  const isRootLevel = parsedArgv.positionals.length === 0;
  const schemaFlag = parsedArgv.flags.schema;
  const selectorValue =
    typeof schemaFlag === "string"
      ? schemaFlag
      : schemaFlag === true
        ? ""
        : null;

  if (!(isRootLevel && selectorValue !== null)) {
    return false;
  }

  try {
    const subset = selectorValue
      ? selectSchema(schema, selectorValue, { depth: 2 }).schema
      : schema;
    const schemaOutput = generateSchema(subset, {
      name: cliOptions.name,
      description: cliOptions.description,
    });
    const maxLines = cliOptions.schemaMaxLines ?? 80;
    const lines = schemaOutput.split("\n");

    if (lines.length > maxLines) {
      console.log(
        `Schema too large (${lines.length} lines). Showing compact outline.`
      );
      console.log();
      for (const line of generateSchemaOutline(subset, 2)) {
        console.log(line);
      }
      console.log();
      console.log("hint: selector is jq-like (path, *, {a,b}, ..name)");
      return true;
    }

    printSchema(schemaOutput);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`Invalid schema selector: ${message}`);
    process.exitCode = 1;
    return true;
  }
}

if (maybeHandleExpandedSchemaSelector()) {
  process.exit(process.exitCode ?? 0);
}

const context = createCliContext(parsedArgv.flags);
const app = cli(schema, createArgcOptions(cliOptions));

await app.run({
  handlers: {
    doctor: {
      dataset: {
        readiness: withLegacyContext(handleDoctorDatasetReadiness, context),
      },
    },
    llmResponse: {
      dataset: {
        models: withLegacyContext(handleLlmResponseDatasetModels, context),
      },
      entity: {
        live: withLegacyContext(handleLlmResponseEntityLive, context),
      },
    },
    llmMention: {
      dataset: {
        locationsAndLanguages: withLegacyContext(
          handleLlmMentionDatasetLocationsAndLanguages,
          context
        ),
        availableFilters: withLegacyContext(
          handleLlmMentionDatasetAvailableFilters,
          context
        ),
        search: withLegacyContext(
          createLlmMentionLiveHandler("search"),
          context
        ),
        topPages: withLegacyContext(
          createLlmMentionLiveHandler("top_pages"),
          context
        ),
        topDomains: withLegacyContext(
          createLlmMentionLiveHandler("top_domains"),
          context
        ),
        aggregatedMetrics: withLegacyContext(
          createLlmMentionLiveHandler("aggregated_metrics"),
          context
        ),
        crossAggregatedMetrics: withLegacyContext(
          createLlmMentionLiveHandler("cross_aggregated_metrics"),
          context
        ),
      },
    },
  },
} as never, parsedArgv.argvForArgc);
