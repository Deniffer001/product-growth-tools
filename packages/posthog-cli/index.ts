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
  parseArgv,
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
import { handleQueryDatasetResults } from "./handlers/query";
import {
  handleDashboardDatasetDashboards,
  handleFeatureFlagDatasetFlags,
  handleInsightDatasetInsights,
} from "./handlers/resources";
import { cliOptions, schema } from "./schema";

const parsedArgv = parseArgv(process.argv.slice(2));

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
  const selectorValue =
    typeof parsedArgv.flags.schema === "string"
      ? parsedArgv.flags.schema
      : null;

  if (!(isRootLevel && selectorValue)) {
    return false;
  }

  try {
    const selected = selectSchema(schema, selectorValue, { depth: 2 });
    const subset = selected.schema;
    const schemaOutput = generateSchema(subset, {
      name: cliOptions.name,
      description: cliOptions.description,
      globals: cliOptions.globals,
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

const app = cli(schema, {
  ...cliOptions,
  context: createCliContext,
});

await app.run({
  handlers: {
    doctor: {
      dataset: {
        readiness: handleDoctorReadinessDataset,
      },
    },
    query: {
      dataset: {
        results: handleQueryDatasetResults,
      },
    },
    event: {
      dataset: {
        counts: handleEventDatasetCounts,
        map: handleEventDatasetMap,
      },
    },
    funnel: {
      analyze: handleFunnelAnalyze,
    },
    audit: {
      dataset: {
        instrumentation: handleAuditDatasetInstrumentation,
      },
    },
    profile: {
      validate: handleProfileValidate,
    },
    project: {
      dataset: {
        "event-definitions": handleProjectEventDefinitionsDataset,
        "property-definitions": handleProjectPropertyDefinitionsDataset,
      },
    },
    "feature-flag": {
      dataset: {
        flags: handleFeatureFlagDatasetFlags,
      },
    },
    insight: {
      dataset: {
        insights: handleInsightDatasetInsights,
      },
    },
    dashboard: {
      dataset: {
        dashboards: handleDashboardDatasetDashboards,
      },
    },
  },
});
