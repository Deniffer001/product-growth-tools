import { toStandardJsonSchema } from "@valibot/to-json-schema";
import { c, generateSchema, group, selectSchema, type Router } from "argc";
import * as v from "valibot";

import { GkitFailure } from "./envelope";
import type { LoadedExecutableManifest } from "./manifest";

const s = toStandardJsonSchema;

export function buildGkitSchema(
  manifest: LoadedExecutableManifest | readonly LoadedExecutableManifest[],
): Router {
  const manifests = Array.isArray(manifest) ? manifest : [manifest];
  const capabilities = manifests.flatMap((candidate) => candidate.document.capabilities);
  const dataForSeoCapabilityCount = capabilities.filter(
    (capability) => capability.provider === "dataforseo",
  ).length;
  if (capabilities.length === 0) {
    throw new GkitFailure({
      code: "INTERNAL_ERROR",
      message: "The executable manifest has no reviewed capabilities.",
    });
  }

  return {
    describe: c
      .meta({
        description: "Expand one reviewed executable capability.",
        examples: ["gkit describe --id dataforseo.backlinks.bulk_ranks.live"],
      })
      .input(s(v.strictObject({ id: v.string() }))),
    docs: c
      .meta({
        description: "Print the local, manifest-generated provider documentation directory.",
        examples: ["gkit docs --provider dataforseo"],
      })
      .input(s(v.strictObject({ provider: v.optional(v.string()) }))),
    ledger: group(
      { description: "Inspect and reconcile the append-only spend ledger." },
      {
        status: c
          .meta({
            description: "Print the ledger path and unresolved spend state: gkit ledger.",
            examples: ["gkit ledger"],
          })
          .input(s(v.strictObject({}))),
        reconcile: c
          .meta({
            description: "Append an evidence-backed manual settlement.",
            examples: [
              "gkit ledger reconcile --attempt <id> --outcome confirmed_not_charged --evidence-ref ticket:123",
            ],
          })
          .input(
            s(
              v.strictObject({
                attempt: v.string(),
                outcome: v.picklist(["confirmed_charged", "confirmed_not_charged"]),
                evidenceRef: v.string(),
                costUsd: v.optional(v.string()),
                providerRequestId: v.optional(v.string()),
              }),
            ),
          ),
      },
    ),
    dataforseo: group(
      { description: "Reviewed DataForSEO reads." },
      {
        doctor: c
          .meta({
            description:
              "Check readiness without a network probe: gkit --profile <app> dataforseo doctor.",
            examples: ["gkit --profile app-a dataforseo doctor"],
          })
          .input(s(v.strictObject({}))),
        api: group(
          { description: "Call a reviewed native DataForSEO operation." },
          {
            call: c
              .meta({
                description: `Call one of ${dataForSeoCapabilityCount} reviewed operations; gkit --profile <app> dataforseo api call --operation-id <id> --input @request.json --allow-spend --max-spend-usd <decimal> --out <path> --dry-run.`,
                examples: [
                  "gkit --profile <app> dataforseo api call --operation-id <id> --input @request.json --allow-spend --max-spend-usd <decimal> --out <path> --dry-run",
                ],
              })
              .input(s(v.strictObject({}))),
          },
        ),
      },
    ),
    posthog: group(
      { description: "Reviewed PostHog reads." },
      {
        doctor: c
          .meta({
            description: "Check local PostHog readiness without a network probe.",
            examples: ["gkit --profile app-a posthog doctor"],
          })
          .input(s(v.strictObject({}))),
        api: group(
          { description: "Call a reviewed native PostHog operation." },
          {
            call: c
              .meta({
                description:
                  "Run a bounded read-only HogQL query: gkit --profile <app> posthog api call --operation-id posthog.query.run --input @request.json --out <path> --dry-run.",
                examples: [
                  "gkit --profile <app> posthog api call --operation-id posthog.query.run --input @request.json --out <path> --dry-run",
                ],
              })
              .input(s(v.strictObject({}))),
          },
        ),
      },
    ),
  };
}

export function renderGkitSchema(
  manifest: LoadedExecutableManifest | readonly LoadedExecutableManifest[],
  selector: string | null,
): string {
  const root = buildGkitSchema(manifest);
  if (!selector) {
    return `${schemaPreamble()}${rewriteArgcExamples(
      generateSchema(root, { name: "gkit" }),
      manifest,
    )}\n`;
  }

  let selected: ReturnType<typeof selectSchema>;
  try {
    const normalizedSelector = selector.startsWith(".") ? selector : `.${selector}`;
    selected = selectSchema(root, normalizedSelector, { depth: 4 });
  } catch {
    throw new GkitFailure({
      code: "INVALID_INPUT",
      message: "The schema selector is invalid.",
    });
  }
  if (selected.empty) {
    throw new GkitFailure({
      code: "CAPABILITY_NOT_FOUND",
      message: `Schema selector ${selector} matched no commands.`,
    });
  }
  return `${schemaPreamble()}${rewriteArgcExamples(
    generateSchema(selected.schema, { name: "gkit" }),
    manifest,
  )}\n`;
}

function schemaPreamble(): string {
  return [
    "/**",
    " * Discovery-only type view. Execute the spaced shell commands shown in @example.",
    " * argc dotted commands and @run are intentionally not exposed by gkit.",
    " */",
    "",
  ].join("\n");
}

function rewriteArgcExamples(
  generated: string,
  _manifest: LoadedExecutableManifest | readonly LoadedExecutableManifest[],
): string {
  return generated
    .replace(/gkit describe "\{ id: 'value' \}"/g, "gkit describe --id <capability-id>")
    .replace(/gkit docs "\{ provider: 'value' \}"/g, "gkit docs --provider <provider>")
    .replace(
      /gkit ledger\.reconcile "[^"]*"/g,
      "gkit ledger reconcile --attempt <id> --outcome <outcome> --evidence-ref <ref> [--cost-usd <decimal>]",
    )
    .replace(
      /gkit dataforseo\.api\.call "[^"]*"/g,
      "gkit --profile <app> dataforseo api call --operation-id <id> --input @request.json --allow-spend --max-spend-usd <decimal> --out <path> --dry-run",
    )
    .replace(
      /gkit posthog\.api\.call "[^"]*"/g,
      "gkit --profile <app> posthog api call --operation-id posthog.query.run --input @request.json --out <path> --dry-run",
    );
}
