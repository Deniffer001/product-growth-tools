#!/usr/bin/env bun
/**
 * @input process argv, product-growth profile env, argc schema, and PostHog handlers
 * @output argc-powered PostHog provider CLI runtime
 * @pos agent-friendly PostHog raw-data entry point
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
import { handleAuditDatasetInstrumentation } from "./handlers/audit";
import { handleDoctorReadinessDataset } from "./handlers/doctor";
import { handleEventDatasetCounts, handleEventDatasetMap } from "./handlers/event";
import { handleFunnelAnalyze } from "./handlers/funnel";
import { handleProfileValidate } from "./handlers/profile";
import {
  handleProjectEventDefinitionsDataset,
  handleProjectPropertyDefinitionsDataset,
} from "./handlers/project";
import { handleQueryActionRun } from "./handlers/query-action";
import { handleQueryDatasetResults } from "./handlers/query";
import {
  handleDashboardDatasetDashboards,
  handleFeatureFlagDatasetFlags,
  handleInsightDatasetInsights,
} from "./handlers/resources";
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
    "posthogApiToken",
    "posthogHost",
    "posthogProjectId",
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
        readiness: withLegacyContext(handleDoctorReadinessDataset, context),
      },
    },
    query: {
      dataset: {
        results: withLegacyContext(handleQueryDatasetResults, context),
      },
      action: {
        run: withLegacyContext(handleQueryActionRun, context),
      },
    },
    event: {
      dataset: {
        counts: withLegacyContext(handleEventDatasetCounts, context),
        map: withLegacyContext(handleEventDatasetMap, context),
      },
    },
    funnel: {
      analyze: withLegacyContext(handleFunnelAnalyze, context),
    },
    audit: {
      dataset: {
        instrumentation: withLegacyContext(
          handleAuditDatasetInstrumentation,
          context
        ),
      },
    },
    profile: {
      validate: withLegacyContext(handleProfileValidate, context),
    },
    project: {
      dataset: {
        "event-definitions": withLegacyContext(
          handleProjectEventDefinitionsDataset,
          context
        ),
        "property-definitions": withLegacyContext(
          handleProjectPropertyDefinitionsDataset,
          context
        ),
      },
    },
    "feature-flag": {
      dataset: {
        flags: withLegacyContext(handleFeatureFlagDatasetFlags, context),
      },
    },
    insight: {
      dataset: {
        insights: withLegacyContext(handleInsightDatasetInsights, context),
      },
    },
    dashboard: {
      dataset: {
        dashboards: withLegacyContext(handleDashboardDatasetDashboards, context),
      },
    },
  },
} as never, parsedArgv.argvForArgc);
