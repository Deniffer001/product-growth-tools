/**
 * @input argc, valibot, and JSON-schema conversion
 * @output schema-first Bing Webmaster CLI definition and options
 * @pos discoverable agent-friendly contract for Bing Webmaster read-only data
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
const cliName = "bing-webmaster";

const cliNumberSchema = pipe(
  string(),
  transform((value) => Number(value)),
  number()
);

const flexibleNumberSchema = union([number(), cliNumberSchema]);

const siteScopedInput = {
  siteUrl: optional(string()),
};

const pagedSiteInput = {
  ...siteScopedInput,
  page: optional(flexibleNumberSchema),
};

export const globalsSchema = s(
  object({
    apiKey: optional(string()),
    siteUrl: optional(string()),
    pretty: optional(boolean()),
  })
);

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
                "Check local credentials, defaults, profile state, and Bing Webmaster reachability",
              examples: ["bing-webmaster doctor dataset readiness --pretty"],
            })
            .input(s(object({}))),
        }
      ),
    }
  ),
  site: group(
    { description: "Bing Webmaster site inventory" },
    {
      dataset: group(
        { description: "Read accessible site datasets" },
        {
          sites: c
            .meta({
              description:
                "List Bing Webmaster sites accessible to the configured API key",
              examples: ["bing-webmaster site dataset sites"],
            })
            .input(s(object({}))),
        }
      ),
    }
  ),
  traffic: group(
    { description: "Search traffic datasets and entities" },
    {
      dataset: group(
        { description: "Read site-level traffic datasets" },
        {
          rank: c
            .meta({
              description:
                "Read Bing rank and traffic stats for a verified site",
              examples: [
                "bing-webmaster traffic dataset rank --site-url https://example.com/",
              ],
            })
            .input(s(object(siteScopedInput))),
          queries: c
            .meta({
              description:
                "Read top query traffic stats for a verified site",
              examples: [
                "bing-webmaster traffic dataset queries --site-url https://example.com/",
              ],
            })
            .input(s(object(siteScopedInput))),
          pages: c
            .meta({
              description:
                "Read top page traffic stats for a verified site",
              examples: [
                "bing-webmaster traffic dataset pages --site-url https://example.com/",
              ],
            })
            .input(s(object(siteScopedInput))),
        }
      ),
      entity: group(
        { description: "Read focused traffic entities" },
        {
          query: c
            .meta({
              description: "Read daily traffic stats for one top query",
              examples: [
                'bing-webmaster traffic entity query --site-url https://example.com/ --query "website cloner"',
              ],
            })
            .input(
              s(
                object({
                  ...siteScopedInput,
                  query: string(),
                })
              )
            ),
          pageQueries: c
            .meta({
              description: "Read query stats for one page URL",
              examples: [
                "bing-webmaster traffic entity pageQueries --site-url https://example.com/ --page-url https://example.com/docs",
              ],
            })
            .input(
              s(
                object({
                  ...siteScopedInput,
                  pageUrl: string(),
                })
              )
            ),
          queryPages: c
            .meta({
              description: "Read page stats for one query",
              examples: [
                'bing-webmaster traffic entity queryPages --site-url https://example.com/ --query "website cloner"',
              ],
            })
            .input(
              s(
                object({
                  ...siteScopedInput,
                  query: string(),
                })
              )
            ),
          queryPage: c
            .meta({
              description: "Read detailed stats for one query and one page URL",
              examples: [
                'bing-webmaster traffic entity queryPage --site-url https://example.com/ --query "website cloner" --page-url https://example.com/docs',
              ],
            })
            .input(
              s(
                object({
                  ...siteScopedInput,
                  query: string(),
                  pageUrl: string(),
                })
              )
            ),
        }
      ),
    }
  ),
  crawl: group(
    { description: "Crawl and index diagnostics" },
    {
      dataset: group(
        { description: "Read crawl datasets" },
        {
          stats: c
            .meta({
              description:
                "Read crawl statistics for the last six months for a verified site",
              examples: [
                "bing-webmaster crawl dataset stats --site-url https://example.com/",
              ],
            })
            .input(s(object(siteScopedInput))),
          issues: c
            .meta({
              description: "Read current crawl issue URLs for a verified site",
              examples: [
                "bing-webmaster crawl dataset issues --site-url https://example.com/",
              ],
            })
            .input(s(object(siteScopedInput))),
        }
      ),
      entity: group(
        { description: "Read crawl settings entities" },
        {
          settings: c
            .meta({
              description: "Read crawl settings for a verified site",
              examples: [
                "bing-webmaster crawl entity settings --site-url https://example.com/",
              ],
            })
            .input(s(object(siteScopedInput))),
        }
      ),
    }
  ),
  link: group(
    { description: "Inbound link datasets and entities" },
    {
      dataset: group(
        { description: "Read inbound link datasets" },
        {
          pages: c
            .meta({
              description:
                "Read pages with inbound links and counts for a verified site",
              examples: [
                "bing-webmaster link dataset pages --site-url https://example.com/ --page 0",
              ],
            })
            .input(s(object(pagedSiteInput))),
        }
      ),
      entity: group(
        { description: "Read inbound link details" },
        {
          url: c
            .meta({
              description: "Read inbound link details for one site URL",
              examples: [
                "bing-webmaster link entity url --site-url https://example.com/ --link https://example.com/docs --page 0",
              ],
            })
            .input(
              s(
                object({
                  ...pagedSiteInput,
                  link: string(),
                })
              )
            ),
        }
      ),
    }
  ),
  sitemap: group(
    { description: "Sitemap/feed datasets and entities" },
    {
      dataset: group(
        { description: "Read submitted feed datasets" },
        {
          feeds: c
            .meta({
              description:
                "Read all top-level feeds or sitemaps for a verified site",
              examples: [
                "bing-webmaster sitemap dataset feeds --site-url https://example.com/",
              ],
            })
            .input(s(object(siteScopedInput))),
        }
      ),
      entity: group(
        { description: "Read feed details" },
        {
          feed: c
            .meta({
              description: "Read feed details for a sitemap index or feed URL",
              examples: [
                "bing-webmaster sitemap entity feed --site-url https://example.com/ --feed-url https://example.com/sitemap.xml",
              ],
            })
            .input(
              s(
                object({
                  ...siteScopedInput,
                  feedUrl: string(),
                })
              )
            ),
        }
      ),
    }
  ),
  url: group(
    { description: "URL index and traffic reads" },
    {
      entity: group(
        { description: "Read URL entities" },
        {
          info: c
            .meta({
              description:
                "Read Bing index details for a URL or domain: target",
              examples: [
                "bing-webmaster url entity info --site-url https://example.com/ --url https://example.com/docs",
                "bing-webmaster url entity info --site-url https://example.com/ --url domain:example.com",
              ],
            })
            .input(
              s(
                object({
                  ...siteScopedInput,
                  url: string(),
                })
              )
            ),
          traffic: c
            .meta({
              description:
                "Read Bing traffic summary for a URL or domain: target",
              examples: [
                "bing-webmaster url entity traffic --site-url https://example.com/ --url https://example.com/docs",
              ],
            })
            .input(
              s(
                object({
                  ...siteScopedInput,
                  url: string(),
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
  version: "0.1.0",
  description: "Agent-friendly Bing Webmaster read-only CLI",
  globals: globalsSchema,
  schemaMaxLines: 36,
};
