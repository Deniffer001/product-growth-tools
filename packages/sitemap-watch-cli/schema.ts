/**
 * @input argc, valibot, and JSON-schema conversion
 * @output schema-first sitemap-watch CLI definition and options
 * @pos discoverable agent-friendly contract for competitor sitemap snapshots
 */

import { toStandardJsonSchema } from "@valibot/to-json-schema";
import { c, group } from "./lib/argc/index";
import { boolean, object, optional, string } from "valibot";

const s = toStandardJsonSchema;
const cliName = "sitemap-watch";

export const globalsSchema = s(
  object({
    pretty: optional(boolean()),
  })
);

export const schema = {
  registry: group(
    { description: "Competitor registry datasets" },
    {
      dataset: group(
        { description: "Read active competitor registry objects" },
        {
          competitors: c
            .meta({
              description:
                "List active competitors from a local registry file, optionally filtered by competitorId",
              examples: [
                "sitemap-watch registry dataset competitors --registry-file ./registry.json",
                "sitemap-watch registry dataset competitors --registry-file ./registry.json --competitor n8n",
              ],
            })
            .input(
              s(
                object({
                  registryFile: string(),
                  competitor: optional(string()),
                })
              )
            ),
        }
      ),
    }
  ),
  snapshot: group(
    { description: "Current sitemap snapshot reads" },
    {
      dataset: group(
        { description: "Read normalized page snapshots" },
        {
          pages: c
            .meta({
              description:
                "Fetch and normalize current sitemap pages for one active competitor or all active competitors",
              examples: [
                "sitemap-watch snapshot dataset pages --registry-file ./registry.json --competitor n8n",
                "sitemap-watch snapshot dataset pages --registry-file ./registry.json --captured-at 2026-04-12T00:00:00Z",
              ],
            })
            .input(
              s(
                object({
                  registryFile: string(),
                  competitor: optional(string()),
                  capturedAt: optional(string()),
                })
              )
            ),
        }
      ),
      entity: group(
        { description: "Read a single normalized page snapshot" },
        {
          page: c
            .meta({
              description:
                "Fetch and normalize the current snapshot record for a single URL under one active competitor",
              examples: [
                "sitemap-watch snapshot entity page --registry-file ./registry.json --competitor n8n --url https://n8n.io/workflows/discord-bot/",
              ],
            })
            .input(
              s(
                object({
                  registryFile: string(),
                  competitor: string(),
                  url: string(),
                  capturedAt: optional(string()),
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
  version: "0.1.4",
  description: "Agent-friendly competitor sitemap snapshot CLI",
  globals: globalsSchema,
  schemaMaxLines: 24,
};
