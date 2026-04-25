/**
 * @input argc, valibot, and JSON-schema conversion
 * @output schema-first SERP snapshot CLI definition and options
 * @pos discoverable agent-friendly contract for search result snapshots
 */

import { toStandardJsonSchema } from "@valibot/to-json-schema";
import { c, group } from "./lib/argc/index";
import {
  boolean,
  number,
  object,
  optional,
  pipe,
  string,
  transform,
  union,
} from "valibot";

const s = toStandardJsonSchema;
const cliName = "serp-snapshot";

const cliNumberSchema = pipe(
  string(),
  transform((value) => Number(value)),
  number()
);

const flexibleNumberSchema = union([number(), cliNumberSchema]);

export const globalsSchema = s(
  object({
    provider: optional(string()),
    dataforseoLogin: optional(string()),
    dataforseoPassword: optional(string()),
    country: optional(string()),
    language: optional(string()),
    pretty: optional(boolean()),
  })
);

const requestInputSchema = {
  country: optional(string()),
  language: optional(string()),
  device: optional(string()),
  os: optional(string()),
  depth: optional(flexibleNumberSchema),
};

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
                "Inspect whether local SERP provider credentials are ready for provider calls",
              examples: ["serp-snapshot doctor dataset readiness --pretty"],
            })
            .input(s(object({}))),
        }
      ),
    }
  ),
  query: group(
    { description: "Single query SERP snapshots" },
    {
      dataset: group(
        { description: "Read normalized Google SERP datasets" },
        {
          results: c
            .meta({
              description:
                "Fetch one Google SERP snapshot for a query, country, language, and device",
              examples: [
                'serp-snapshot query dataset results --query "typeless alternative for mac" --country US --language en --device desktop --os macos --depth 20',
              ],
            })
            .input(
              s(
                object({
                  query: string(),
                  ...requestInputSchema,
                })
              )
            ),
        }
      ),
    }
  ),
  batch: group(
    { description: "Batch query SERP snapshots" },
    {
      dataset: group(
        { description: "Read multiple normalized Google SERP datasets" },
        {
          results: c
            .meta({
              description:
                "Fetch Google SERP snapshots from a JSONL file with one query string or object per line",
              examples: [
                "serp-snapshot batch dataset results --input-file ./keywords.jsonl --country US --language en --device desktop",
              ],
            })
            .input(
              s(
                object({
                  inputFile: string(),
                  ...requestInputSchema,
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
  version: "0.1.1",
  description: "Agent-friendly SERP snapshot CLI",
  globals: globalsSchema,
  schemaMaxLines: 24,
};
