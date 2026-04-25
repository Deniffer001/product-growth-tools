/**
 * @input argc, valibot, and JSON-schema conversion
 * @output schema-first Google Ads CLI definition and options
 * @pos discoverable agent-friendly Google Ads contract
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
const cliName = "google-ads";

const cliNumberSchema = pipe(
  string(),
  transform((value) => Number(value)),
  number()
);

const flexibleNumberSchema = union([number(), cliNumberSchema]);

export const globalsSchema = s(
  object({
    credentialsFile: optional(string()),
    customerId: optional(string()),
    loginCustomerId: optional(string()),
    linkedCustomerId: optional(string()),
    pretty: optional(boolean()),
  })
);

export const schema = {
  adGroup: group(
    { description: "Ad group reporting datasets" },
    {
      dataset: group(
        { description: "Read ad group performance datasets" },
        {
          performance: c
            .meta({
              description:
                "Read ad group performance rows for a customer over a date range",
              examples: [
                "google-ads adGroup dataset performance --customer-id 1234567890 --start-date 2026-04-01 --end-date 2026-04-07",
              ],
            })
            .input(
              s(
                object({
                  customerId: optional(string()),
                  startDate: string(),
                  endDate: string(),
                  limit: optional(flexibleNumberSchema),
                })
              )
            ),
        }
      ),
    }
  ),
  doctor: group(
    { description: "Runtime diagnostics" },
    {
      dataset: group(
        { description: "Read local readiness datasets" },
        {
          readiness: c
            .meta({
              description:
                "Inspect whether local Google Ads credentials and runtime are ready for provider calls",
              examples: ["google-ads doctor dataset readiness --pretty"],
            })
            .input(s(object({}))),
        }
      ),
    }
  ),
  customer: group(
    { description: "Customer discovery" },
    {
      dataset: group(
        { description: "Read accessible customer datasets" },
        {
          accounts: c
            .meta({
              description:
                "List Google Ads customers accessible by the configured refresh token",
              examples: [
                "google-ads customer dataset accounts",
                "google-ads customer dataset accounts --pretty",
              ],
            })
            .input(s(object({}))),
        }
      ),
    }
  ),
  campaign: group(
    { description: "Campaign reporting datasets" },
    {
      dataset: group(
        { description: "Read campaign performance datasets" },
        {
          performance: c
            .meta({
              description:
                "Read campaign performance rows for a customer over a date range",
              examples: [
                "google-ads campaign dataset performance --customer-id 1234567890 --start-date 2026-04-01 --end-date 2026-04-07",
                "google-ads campaign dataset performance --start-date 2026-04-01 --end-date 2026-04-07 --limit 25",
              ],
            })
            .input(
              s(
                object({
                  customerId: optional(string()),
                  startDate: string(),
                  endDate: string(),
                  limit: optional(flexibleNumberSchema),
                })
              )
            ),
        }
      ),
    }
  ),
  searchTerm: group(
    { description: "Search term reporting datasets" },
    {
      dataset: group(
        { description: "Read search term performance datasets" },
        {
          performance: c
            .meta({
              description:
                "Read search term performance rows for a customer over a date range",
              examples: [
                "google-ads searchTerm dataset performance --customer-id 1234567890 --start-date 2026-04-01 --end-date 2026-04-07",
              ],
            })
            .input(
              s(
                object({
                  customerId: optional(string()),
                  startDate: string(),
                  endDate: string(),
                  limit: optional(flexibleNumberSchema),
                })
              )
            ),
        }
      ),
    }
  ),
  keyword: group(
    { description: "Keyword reporting datasets" },
    {
      dataset: group(
        { description: "Read keyword performance datasets" },
        {
          performance: c
            .meta({
              description:
                "Read keyword performance rows for a customer over a date range",
              examples: [
                "google-ads keyword dataset performance --customer-id 1234567890 --start-date 2026-04-01 --end-date 2026-04-07",
              ],
            })
            .input(
              s(
                object({
                  customerId: optional(string()),
                  startDate: string(),
                  endDate: string(),
                  limit: optional(flexibleNumberSchema),
                })
              )
            ),
        }
      ),
    }
  ),
  keywordPlan: group(
    { description: "Keyword Planner datasets" },
    {
      dataset: group(
        { description: "Read Keyword Planner discovery datasets" },
        {
          ideas: c
            .meta({
              description:
                "Generate keyword ideas from keyword and/or URL seeds",
              examples: [
                'google-ads keywordPlan dataset ideas --customer-id 1234567890 --keywords "ai browser,browser automation" --geo-target-ids "2840" --language-id 1000',
                'google-ads keywordPlan dataset ideas --page-url https://example.com --geo-target-ids "2840" --language-id 1000 --limit 100',
              ],
            })
            .input(
              s(
                object({
                  customerId: optional(string()),
                  keywords: optional(string()),
                  pageUrl: optional(string()),
                  geoTargetIds: optional(string()),
                  languageId: optional(string()),
                  network: optional(string()),
                  includeAdultKeywords: optional(boolean()),
                  limit: optional(flexibleNumberSchema),
                })
              )
            ),
          historicalMetrics: c
            .meta({
              description:
                "Generate historical metrics for an explicit keyword list",
              examples: [
                'google-ads keywordPlan dataset historicalMetrics --customer-id 1234567890 --keywords "ai browser,browser automation" --geo-target-ids "2840" --language-id 1000',
              ],
            })
            .input(
              s(
                object({
                  customerId: optional(string()),
                  keywords: string(),
                  geoTargetIds: optional(string()),
                  languageId: optional(string()),
                  network: optional(string()),
                  includeAverageCpc: optional(boolean()),
                })
              )
            ),
        }
      ),
    }
  ),
  query: group(
    { description: "Raw GAQL datasets" },
    {
      dataset: group(
        { description: "Execute raw GAQL against a customer" },
        {
          gaql: c
            .meta({
              description:
                "Run a read-only GAQL query for a customer and return raw rows",
              examples: [
                'google-ads query dataset gaql --customer-id 1234567890 --query "SELECT campaign.id, campaign.name FROM campaign LIMIT 10"',
              ],
            })
            .input(
              s(
                object({
                  customerId: optional(string()),
                  query: string(),
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
  description: "Agent-friendly Google Ads CLI",
  globals: globalsSchema,
  schemaMaxLines: 24,
};
