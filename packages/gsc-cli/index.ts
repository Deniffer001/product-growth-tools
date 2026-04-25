#!/usr/bin/env bun
/**
 * @input process argv, repo env files, argc schema, and GSC handlers
 * @output argc-powered Google Search Console CLI runtime
 * @pos app-owned SEO CLI entry point for agent consumers
 */

import {
  cli,
  generateSchema,
  generateSchemaOutline,
  parseArgv,
  selectSchema,
} from "./lib/argc/index";
import {
  createCliContext,
  loadDefaultCliEnv,
  shouldLoadDefaultCliEnv,
} from "./client";
import { handleDoctorReadinessDataset } from "./handlers/doctor";
import { handleInspectionEntityUrl } from "./handlers/inspection";
import { handlePropertySitesDataset } from "./handlers/property";
import { handleSearchAnalyticsDataset } from "./handlers/search";
import {
  handleSitemapDatasetSitemaps,
  handleSitemapEntitySitemap,
} from "./handlers/sitemap";
import {
  handleSkillInstall,
  handleSkillPath,
  handleSkillPrint,
} from "./handlers/skill";
import { cliOptions, schema } from "./schema";

const parsedArgv = parseArgv(process.argv.slice(2));

if (shouldLoadDefaultCliEnv(parsedArgv)) {
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
    skill: {
      path: handleSkillPath,
      print: handleSkillPrint,
      install: handleSkillInstall,
    },
    doctor: {
      dataset: {
        readiness: handleDoctorReadinessDataset,
      },
    },
    inspection: {
      entity: {
        url: handleInspectionEntityUrl,
      },
    },
    property: {
      dataset: {
        sites: handlePropertySitesDataset,
      },
    },
    sitemap: {
      entity: {
        sitemap: handleSitemapEntitySitemap,
      },
      dataset: {
        sitemaps: handleSitemapDatasetSitemaps,
      },
    },
    search: {
      dataset: {
        analytics: handleSearchAnalyticsDataset,
      },
    },
  },
});
