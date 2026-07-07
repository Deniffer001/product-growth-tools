#!/usr/bin/env bun
/**
 * @input process argv, repo env files, argc schema, and Bing Webmaster handlers
 * @output argc-powered Bing Webmaster CLI runtime
 * @pos read-only provider CLI entry point for SEO agent consumers
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
import {
  handleCrawlDatasetIssues,
  handleCrawlDatasetStats,
  handleCrawlEntitySettings,
} from "./handlers/crawl";
import { handleDoctorDatasetReadiness } from "./handlers/doctor";
import {
  handleLinkDatasetPages,
  handleLinkEntityUrl,
} from "./handlers/link";
import {
  handleSitemapDatasetFeeds,
  handleSitemapEntityFeed,
} from "./handlers/sitemap";
import { handleSiteDatasetSites } from "./handlers/site";
import {
  handleTrafficDatasetPages,
  handleTrafficDatasetQueries,
  handleTrafficDatasetRank,
  handleTrafficEntityPageQueries,
  handleTrafficEntityQuery,
  handleTrafficEntityQueryPage,
  handleTrafficEntityQueryPages,
} from "./handlers/traffic";
import {
  handleUrlEntityInfo,
  handleUrlEntityTraffic,
} from "./handlers/url";
import {
  createArgcOptions,
  normalizeLegacyArgv,
  withLegacyContext,
} from "./lib/argc-compat";
import { cliOptions, schema } from "./schema";

const parsedArgv = normalizeLegacyArgv({
  argv: process.argv.slice(2),
  schema,
  globalFlags: ["apiKey", "siteUrl", "pretty"],
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
    site: {
      dataset: {
        sites: withLegacyContext(handleSiteDatasetSites, context),
      },
    },
    traffic: {
      dataset: {
        rank: withLegacyContext(handleTrafficDatasetRank, context),
        queries: withLegacyContext(handleTrafficDatasetQueries, context),
        pages: withLegacyContext(handleTrafficDatasetPages, context),
      },
      entity: {
        query: withLegacyContext(handleTrafficEntityQuery, context),
        pageQueries: withLegacyContext(handleTrafficEntityPageQueries, context),
        queryPages: withLegacyContext(handleTrafficEntityQueryPages, context),
        queryPage: withLegacyContext(handleTrafficEntityQueryPage, context),
      },
    },
    crawl: {
      dataset: {
        stats: withLegacyContext(handleCrawlDatasetStats, context),
        issues: withLegacyContext(handleCrawlDatasetIssues, context),
      },
      entity: {
        settings: withLegacyContext(handleCrawlEntitySettings, context),
      },
    },
    link: {
      dataset: {
        pages: withLegacyContext(handleLinkDatasetPages, context),
      },
      entity: {
        url: withLegacyContext(handleLinkEntityUrl, context),
      },
    },
    sitemap: {
      dataset: {
        feeds: withLegacyContext(handleSitemapDatasetFeeds, context),
      },
      entity: {
        feed: withLegacyContext(handleSitemapEntityFeed, context),
      },
    },
    url: {
      entity: {
        info: withLegacyContext(handleUrlEntityInfo, context),
        traffic: withLegacyContext(handleUrlEntityTraffic, context),
      },
    },
  },
} as never, parsedArgv.argvForArgc);
