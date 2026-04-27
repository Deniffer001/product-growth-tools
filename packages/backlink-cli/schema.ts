/**
 * @input argc, valibot, and JSON-schema conversion
 * @output schema-first backlink CLI definition and options
 * @pos discoverable agent-friendly contract for backlink provider reads
 */

import { toStandardJsonSchema } from "@valibot/to-json-schema";
import { c, group } from "argc";
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
const cliName = "backlink";

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
    pretty: optional(boolean()),
  })
);

const summaryInputSchema = {
  target: string(),
  includeSubdomains: optional(boolean()),
  internalListLimit: optional(flexibleNumberSchema),
  backlinksStatusType: optional(string()),
};

const listInputSchema = {
  target: string(),
  limit: optional(flexibleNumberSchema),
  offset: optional(flexibleNumberSchema),
  orderBy: optional(string()),
  excludeInternalBacklinks: optional(boolean()),
  backlinksStatusType: optional(string()),
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
                "Inspect whether local DataForSEO backlink credentials are configured",
              examples: ["backlink doctor dataset readiness --pretty"],
            })
            .input(s(object({}))),
        }
      ),
    }
  ),
  domain: group(
    { description: "Domain-level backlink reads" },
    {
      dataset: group(
        { description: "Read normalized domain backlink datasets" },
        {
          summary: c
            .meta({
              description:
                "Fetch DataForSEO Backlinks summary for a domain or subdomain",
              examples: [
                "backlink domain dataset summary --target openclawai.io",
              ],
            })
            .input(s(object(summaryInputSchema))),
          referringDomains: c
            .meta({
              description:
                "Fetch referring domains pointing to a domain or subdomain",
              examples: [
                "backlink domain dataset referringDomains --target openclawai.io --limit 20 --order-by rank,desc",
              ],
            })
            .input(s(object(listInputSchema))),
          anchors: c
            .meta({
              description:
                "Fetch anchor text stats for a domain or subdomain",
              examples: [
                "backlink domain dataset anchors --target openclawai.io --limit 20 --order-by backlinks,desc",
              ],
            })
            .input(s(object(listInputSchema))),
        }
      ),
    }
  ),
  page: group(
    { description: "Page-level backlink reads" },
    {
      dataset: group(
        { description: "Read normalized page backlink datasets" },
        {
          summary: c
            .meta({
              description:
                "Fetch DataForSEO Backlinks summary for one absolute page URL",
              examples: [
                "backlink page dataset summary --target https://openclawai.io/",
              ],
            })
            .input(s(object(summaryInputSchema))),
          backlinks: c
            .meta({
              description:
                "Fetch unique backlinks pointing to one absolute page URL",
              examples: [
                "backlink page dataset backlinks --target https://openclawai.io/ --limit 20 --order-by rank,desc",
              ],
            })
            .input(s(object(listInputSchema))),
          anchors: c
            .meta({
              description:
                "Fetch anchor text stats for one absolute page URL",
              examples: [
                "backlink page dataset anchors --target https://openclawai.io/ --limit 20 --order-by backlinks,desc",
              ],
            })
            .input(s(object(listInputSchema))),
        }
      ),
    }
  ),
};

export const cliOptions = {
  name: cliName,
  version: "0.1.0",
  description: "Agent-friendly backlink raw-data CLI",
  globals: globalsSchema,
  schemaMaxLines: 24,
};
