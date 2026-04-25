/**
 * @input argc, valibot, and JSON-schema conversion
 * @output schema-first page-extract CLI definition and options
 * @pos discoverable agent-friendly contract for page content extraction
 */

import { toStandardJsonSchema } from "@valibot/to-json-schema";
import { c, group } from "./lib/argc/index";
import { boolean, object, optional, string } from "valibot";

const s = toStandardJsonSchema;
const cliName = "page-extract";

export const globalsSchema = s(
  object({
    ctxBin: optional(string()),
    pretty: optional(boolean()),
  })
);

export const schema = {
  page: group(
    { description: "Page extraction reads" },
    {
      entity: group(
        { description: "Read a single page extraction artifact" },
        {
          extract: c
            .meta({
              description:
                "Fetch a page through ctx and return normalized SEO/GEO extraction fields",
              examples: [
                "page-extract page entity extract --url https://example.com/blog/seo",
                "page-extract page entity extract --url https://example.com/blog/seo --screenshot --screenshot-output ./artifacts/example.png",
              ],
            })
            .input(
              s(
                object({
                  url: string(),
                  provider: optional(string()),
                  screenshot: optional(boolean()),
                  screenshotOutput: optional(string()),
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
  description: "Agent-friendly page fetch and content extraction CLI",
  globals: globalsSchema,
  schemaMaxLines: 24,
};
