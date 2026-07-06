#!/usr/bin/env bun
/**
 * @input process argv, argc schema, and backlink handlers
 * @output argc-powered backlink CLI runtime
 * @pos provider-only CLI entry point for SEO agent consumers
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
  handleDomainDatasetAnchors,
  handleDomainDatasetReferringDomains,
  handleDomainDatasetSummary,
} from "./handlers/domain";
import {
  handlePageDatasetAnchors,
  handlePageDatasetBacklinks,
  handlePageDatasetSummary,
} from "./handlers/page";
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
    "provider",
    "dataforseoLogin",
    "dataforseoPassword",
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
    domain: {
      dataset: {
        summary: withLegacyContext(handleDomainDatasetSummary, context),
        referringDomains: withLegacyContext(
          handleDomainDatasetReferringDomains,
          context
        ),
        anchors: withLegacyContext(handleDomainDatasetAnchors, context),
      },
    },
    page: {
      dataset: {
        summary: withLegacyContext(handlePageDatasetSummary, context),
        backlinks: withLegacyContext(handlePageDatasetBacklinks, context),
        anchors: withLegacyContext(handlePageDatasetAnchors, context),
      },
    },
  },
} as never, parsedArgv.argvForArgc);
