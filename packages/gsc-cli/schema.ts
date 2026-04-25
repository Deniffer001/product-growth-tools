/**
 * @input argc, valibot, and JSON-schema conversion
 * @output schema-first GSC CLI definition and options
 * @pos discoverable agent-friendly Google Search Console contract
 */

import { toStandardJsonSchema } from "@valibot/to-json-schema";
import { c, group } from "argc";
import {
  boolean,
  literal,
  number,
  object,
  optional,
  pipe,
  string,
  transform,
  union,
} from "valibot";

const s = toStandardJsonSchema;
const cliName = "gsc";

const searchTypeSchema = union([
  literal("web"),
  literal("image"),
  literal("video"),
  literal("news"),
  literal("discover"),
  literal("googleNews"),
]);

const aggregationTypeSchema = union([
  literal("auto"),
  literal("byPage"),
  literal("byProperty"),
  literal("byNewsShowcasePanel"),
]);

const filterOperatorSchema = union([
  literal("equals"),
  literal("contains"),
  literal("notEquals"),
  literal("notContains"),
  literal("includingRegex"),
  literal("excludingRegex"),
]);

const cliNumberSchema = pipe(
  string(),
  transform((value) => Number(value)),
  number()
);

const flexibleNumberSchema = union([number(), cliNumberSchema]);

export const globalsSchema = s(
  object({
    credentialsFile: optional(string()),
    siteUrl: optional(string()),
    pretty: optional(boolean()),
  })
);

export const schema = {
  skill: group(
    { description: "Agent skill registration helpers" },
    {
      path: c
        .meta({
          description: "Print the canonical bundled skill path",
          examples: ["gsc skill path", "gsc skill path --skill gsc-cli"],
        })
        .input(
          s(
            object({
              skill: optional(string()),
            })
          )
        ),
      print: c
        .meta({
          description: "Print the canonical bundled skill markdown",
          examples: ["gsc skill print", "gsc skill print --skill gsc-cli"],
        })
        .input(
          s(
            object({
              skill: optional(string()),
            })
          )
        ),
      install: c
        .meta({
          description:
            "Install a bundled skill into .agents/skills for the current project",
          examples: [
            "gsc skill install",
            "gsc skill install --skill gsc-cli",
            "gsc skill install --global",
            "gsc skill install --force",
          ],
        })
        .input(
          s(
            object({
              skill: optional(string()),
              global: optional(boolean()),
              force: optional(boolean()),
            })
          )
        ),
    }
  ),
  doctor: group(
    { description: "Local runtime and provider readiness checks" },
    {
      dataset: group(
        { description: "Read diagnostic datasets" },
        {
          readiness: c
            .meta({
              description:
                "Check local credentials, defaults, and Search Console provider reachability",
              examples: ["gsc doctor dataset readiness"],
            })
            .input(s(object({}))),
        }
      ),
    }
  ),
  inspection: group(
    { description: "URL inspection reads" },
    {
      entity: group(
        { description: "Read a single inspection object" },
        {
          url: c
            .meta({
              description:
                "Read URL inspection data for a single URL within a property",
              examples: [
                "gsc inspection entity url --site-url sc-domain:example.com --inspection-url https://example.com/docs/seo",
                'gsc inspection entity url --input \'{"siteUrl":"sc-domain:example.com","inspectionUrl":"https://example.com/docs/seo"}\'',
              ],
            })
            .input(
              s(
                object({
                  siteUrl: optional(string()),
                  inspectionUrl: string(),
                  languageCode: optional(string()),
                })
              )
            ),
        }
      ),
    }
  ),
  property: group(
    { description: "Search Console property discovery" },
    {
      dataset: group(
        { description: "Read accessible property datasets" },
        {
          sites: c
            .meta({
              description:
                "List Search Console properties the configured account can access",
              examples: [
                "gsc property dataset sites",
                "gsc property dataset sites --permission-level siteOwner",
              ],
            })
            .input(
              s(
                object({
                  permissionLevel: optional(string()),
                })
              )
            ),
        }
      ),
    }
  ),
  sitemap: group(
    { description: "Sitemap reads" },
    {
      entity: group(
        { description: "Read a single sitemap object" },
        {
          sitemap: c
            .meta({
              description: "Read a submitted sitemap by feed URL",
              examples: [
                "gsc sitemap entity sitemap --site-url sc-domain:example.com --feedpath https://example.com/sitemap.xml",
                'gsc sitemap entity sitemap --input \'{"siteUrl":"sc-domain:example.com","feedpath":"https://example.com/sitemap.xml"}\'',
              ],
            })
            .input(
              s(
                object({
                  siteUrl: optional(string()),
                  feedpath: string(),
                })
              )
            ),
        }
      ),
      dataset: group(
        { description: "Read sitemap datasets" },
        {
          sitemaps: c
            .meta({
              description:
                "List sitemaps submitted for a property or under a sitemap index",
              examples: [
                "gsc sitemap dataset sitemaps --site-url sc-domain:example.com",
                "gsc sitemap dataset sitemaps --site-url sc-domain:example.com --sitemap-index https://example.com/sitemap_index.xml",
              ],
            })
            .input(
              s(
                object({
                  siteUrl: optional(string()),
                  sitemapIndex: optional(string()),
                })
              )
            ),
        }
      ),
    }
  ),
  search: group(
    { description: "Search performance datasets" },
    {
      dataset: group(
        { description: "Read raw analytics datasets" },
        {
          analytics: c
            .meta({
              description:
                "Read Search Analytics rows for a property with dimensions and filters",
              examples: [
                "gsc search dataset analytics --site-url sc-domain:example.com --start-date 2026-03-01 --end-date 2026-03-31",
                'gsc search dataset analytics --start-date 2026-03-01 --end-date 2026-03-31 --dimensions "query,page"',
                'gsc search dataset analytics --input \'{"startDate":"2026-03-01","endDate":"2026-03-31","dimensions":"query,page","queryFilter":"seo","rowLimit":100}\'',
              ],
            })
            .input(
              s(
                object({
                  siteUrl: optional(string()),
                  startDate: string(),
                  endDate: string(),
                  dimensions: optional(string()),
                  type: optional(searchTypeSchema),
                  aggregationType: optional(aggregationTypeSchema),
                  dataState: optional(
                    union([literal("all"), literal("final")])
                  ),
                  rowLimit: optional(flexibleNumberSchema),
                  startRow: optional(flexibleNumberSchema),
                  queryFilter: optional(string()),
                  pageFilter: optional(string()),
                  countryFilter: optional(string()),
                  deviceFilter: optional(
                    union([
                      literal("DESKTOP"),
                      literal("MOBILE"),
                      literal("TABLET"),
                    ])
                  ),
                  filterOperator: optional(filterOperatorSchema),
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
  version: "0.1.5",
  description: "Agent-friendly Google Search Console CLI",
  globals: globalsSchema,
  schemaMaxLines: 24,
};
