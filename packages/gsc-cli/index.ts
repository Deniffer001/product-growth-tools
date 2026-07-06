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
  selectSchema,
} from "argc";
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
import {
  createArgcOptions,
  normalizeLegacyArgv,
  withLegacyContext,
} from "./lib/argc-compat";
import { cliOptions, schema } from "./schema";

const parsedArgv = normalizeLegacyArgv({
  argv: process.argv.slice(2),
  schema,
  globalFlags: ["credentialsFile", "siteUrl", "pretty"],
});

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
    skill: {
      path: withLegacyContext(handleSkillPath, context),
      print: withLegacyContext(handleSkillPrint, context),
      install: withLegacyContext(handleSkillInstall, context),
    },
    doctor: {
      dataset: {
        readiness: withLegacyContext(handleDoctorReadinessDataset, context),
      },
    },
    inspection: {
      entity: {
        url: withLegacyContext(handleInspectionEntityUrl, context),
      },
    },
    property: {
      dataset: {
        sites: withLegacyContext(handlePropertySitesDataset, context),
      },
    },
    sitemap: {
      entity: {
        sitemap: withLegacyContext(handleSitemapEntitySitemap, context),
      },
      dataset: {
        sitemaps: withLegacyContext(handleSitemapDatasetSitemaps, context),
      },
    },
    search: {
      dataset: {
        analytics: withLegacyContext(handleSearchAnalyticsDataset, context),
      },
    },
  },
} as never, parsedArgv.argvForArgc);
