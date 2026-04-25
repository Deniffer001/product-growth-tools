#!/usr/bin/env bun
/**
 * @input process argv, argc schema, and sitemap-watch handlers
 * @output argc-powered competitor sitemap snapshot CLI runtime
 * @pos app-owned provider-adjacent CLI entry point for agent consumers
 */

import {
  cli,
  generateSchema,
  generateSchemaOutline,
  parseArgv,
  selectSchema,
} from "argc";
import { createCliContext } from "./context";
import { handleRegistryDatasetCompetitors } from "./handlers/registry";
import {
  handleSnapshotDatasetPages,
  handleSnapshotEntityPage,
} from "./handlers/snapshot";
import { cliOptions, schema } from "./schema";

const parsedArgv = parseArgv(process.argv.slice(2));

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
    registry: {
      dataset: {
        competitors: handleRegistryDatasetCompetitors,
      },
    },
    snapshot: {
      dataset: {
        pages: handleSnapshotDatasetPages,
      },
      entity: {
        page: handleSnapshotEntityPage,
      },
    },
  },
});
