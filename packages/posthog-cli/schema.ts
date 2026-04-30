/**
 * @input argc, valibot, and JSON-schema conversion
 * @output schema-first PostHog CLI definition and options
 * @pos discoverable agent-friendly PostHog provider-read contract
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
import { POSTHOG_CLI_VERSION } from "./constants";

const s = toStandardJsonSchema;
const cliName = "posthog";

const cliNumberSchema = pipe(
  string(),
  transform((value) => Number(value)),
  number()
);

const flexibleNumberSchema = union([number(), cliNumberSchema]);

export const globalsSchema = s(
  object({
    posthogApiToken: optional(string()),
    posthogHost: optional(string()),
    posthogProjectId: optional(string()),
    pretty: optional(boolean()),
  })
);

const listInputSchema = {
  limit: optional(flexibleNumberSchema),
  offset: optional(flexibleNumberSchema),
  search: optional(string()),
};

export const schema = {
  doctor: group(
    { description: "Local runtime and provider readiness checks" },
    {
      dataset: group(
        { description: "Read diagnostic datasets" },
        {
          readiness: c
            .meta({
              description:
                "Check PostHog API key, active project resolution, and visible key scopes",
              examples: ["posthog doctor dataset readiness"],
            })
            .input(s(object({}))),
        }
      ),
    }
  ),
  query: group(
    { description: "HogQL query reads" },
    {
      dataset: group(
        { description: "Read raw query result datasets" },
        {
          results: c
            .meta({
              description:
                "Run a HogQL query through PostHog's official agent toolkit; appends LIMIT 100 unless a LIMIT is already present",
              examples: [
                'posthog query dataset results --query "SELECT event, count() FROM events GROUP BY event ORDER BY count() DESC LIMIT 20"',
                'posthog query dataset results --input \'{"query":"SELECT * FROM events","limit":50}\'',
              ],
            })
            .input(
              s(
                object({
                  query: string(),
                  limit: optional(flexibleNumberSchema),
                  noLimitGuard: optional(boolean()),
                  raw: optional(boolean()),
                })
              )
            ),
        }
      ),
      action: group(
        { description: "Execute query reads into reproducible artifact directories" },
        {
          run: c
            .meta({
              description:
                "Run a PostHog query request file and write request, command, stdout, stderr, result, and manifest artifacts",
              examples: [
                "posthog query action run --request ./request.json --out ./artifacts/posthog-query",
              ],
            })
            .input(
              s(
                object({
                  request: string(),
                  out: string(),
                })
              )
            ),
        }
      ),
    }
  ),
  project: group(
    { description: "Project-level PostHog metadata reads" },
    {
      dataset: group(
        { description: "Read project metadata datasets" },
        {
          "event-definitions": c
            .meta({
              description: "List PostHog event definitions for the active project",
              examples: [
                "posthog project dataset event-definitions",
                "posthog project dataset event-definitions --q checkout",
              ],
            })
            .input(s(object({ q: optional(string()) }))),
          "property-definitions": c
            .meta({
              description:
                "List PostHog event or person property definitions for the active project",
              examples: [
                "posthog project dataset property-definitions --type person",
                "posthog project dataset property-definitions --type event --event-name '$pageview'",
              ],
            })
            .input(
              s(
                object({
                  type: union([literal("event"), literal("person")]),
                  eventName: optional(string()),
                  includePredefinedProperties: optional(boolean()),
                })
              )
            ),
        }
      ),
    }
  ),
  event: group(
    { description: "Event traffic reads" },
    {
      dataset: group(
        { description: "Read observed event datasets" },
        {
          counts: c
            .meta({
              description:
                "Count observed events and distinct users in a time window for event discovery and funnel planning",
              examples: [
                "posthog event dataset counts --window 3d --limit 200",
                "posthog event dataset counts --window 3d --q checkout",
                "posthog event dataset counts --events event.one,event.two",
              ],
            })
            .input(
              s(
                object({
                  window: optional(string()),
                  from: optional(string()),
                  to: optional(string()),
                  limit: optional(flexibleNumberSchema),
                  events: optional(string()),
                  q: optional(string()),
                })
              )
            ),
          map: c
            .meta({
              description:
                "Group observed event counts by event namespace for fast discovery before choosing funnels",
              examples: [
                "posthog event dataset map --window 3d --limit 500",
                "posthog event dataset map --from 2026-04-24 --to 2026-04-27",
              ],
            })
            .input(
              s(
                object({
                  window: optional(string()),
                  from: optional(string()),
                  to: optional(string()),
                  limit: optional(flexibleNumberSchema),
                  events: optional(string()),
                  q: optional(string()),
                })
              )
            ),
        }
      ),
    }
  ),
  funnel: group(
    { description: "Funnel reads" },
    {
      analyze: c
        .meta({
          description:
            "Analyze an ordered event funnel without hand-writing HogQL; pass --events directly or --preset from the active profile",
          examples: [
            "posthog funnel analyze --window 3d --events event.one,event.two,event.three",
            "PRODUCT_GROWTH_PROFILE=my-product posthog funnel analyze --window 3d --preset example_funnel",
          ],
        })
        .input(
          s(
            object({
              events: optional(string()),
              preset: optional(string()),
              window: optional(string()),
              from: optional(string()),
              to: optional(string()),
            })
          )
        ),
    }
  ),
  audit: group(
    { description: "Telemetry support audits" },
    {
      dataset: group(
        { description: "Read audit datasets" },
        {
          instrumentation: c
            .meta({
              description:
                "Check whether event definitions and observed traffic can support a requested funnel analysis",
              examples: [
                "posthog audit dataset instrumentation --window 3d --preset example_funnel",
                "posthog audit dataset instrumentation --from 2026-04-24 --to 2026-04-27 --events event.one,event.two",
              ],
            })
            .input(
              s(
                object({
                  events: optional(string()),
                  preset: optional(string()),
                  window: optional(string()),
                  from: optional(string()),
                  to: optional(string()),
                })
              )
            ),
        }
      ),
    }
  ),
  profile: group(
    { description: "Active product-growth profile checks" },
    {
      validate: c
        .meta({
          description:
            "Validate non-secret PostHog profile artifacts such as posthog.funnels.json",
          examples: [
            "PRODUCT_GROWTH_PROFILE=my-product posthog profile validate",
          ],
        })
        .input(s(object({}))),
    }
  ),
  "feature-flag": group(
    { description: "Feature flag reads" },
    {
      dataset: group(
        { description: "Read feature flag datasets" },
        {
          flags: c
            .meta({
              description: "List feature flags for the active PostHog project",
              examples: ["posthog feature-flag dataset flags"],
            })
            .input(s(object({}))),
        }
      ),
    }
  ),
  insight: group(
    { description: "Insight reads" },
    {
      dataset: group(
        { description: "Read insight datasets" },
        {
          insights: c
            .meta({
              description: "List insights for the active PostHog project",
              examples: [
                "posthog insight dataset insights --limit 20",
                "posthog insight dataset insights --search conversion",
                "posthog insight dataset insights --limit 5 --raw",
              ],
            })
            .input(
              s(
                object({
                  ...listInputSchema,
                  favorited: optional(boolean()),
                  raw: optional(boolean()),
                })
              )
            ),
        }
      ),
    }
  ),
  dashboard: group(
    { description: "Dashboard reads" },
    {
      dataset: group(
        { description: "Read dashboard datasets" },
        {
          dashboards: c
            .meta({
              description: "List dashboards for the active PostHog project",
              examples: [
                "posthog dashboard dataset dashboards --limit 20",
                "posthog dashboard dataset dashboards --search growth",
              ],
            })
            .input(
              s(
                object({
                  ...listInputSchema,
                  pinned: optional(boolean()),
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
  version: POSTHOG_CLI_VERSION,
  description: "Agent-friendly PostHog provider CLI",
  globals: globalsSchema,
  schemaMaxLines: 24,
};
