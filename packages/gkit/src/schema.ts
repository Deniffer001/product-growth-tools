import { toStandardJsonSchema } from "@valibot/to-json-schema";
import { c, generateSchema, group, selectSchema, type Router, type Schema } from "argc";
import * as v from "valibot";

import { GkitFailure } from "./envelope";
import {
  type LoadedExecutableManifest,
  type ManifestRecord,
  validateManifestInput,
} from "./manifest";

const s = toStandardJsonSchema;

function schemaFromManifest(record: ManifestRecord): Schema {
  return {
    "~standard": {
      version: 1,
      vendor: "gkit-executable-manifest",
      validate: (value: unknown) => {
        const result = validateManifestInput(record, value);
        if (result.ok) return { value: result.value };
        return {
          issues: result.issues.map((issue) => ({
            message: `${issue.instancePath || "/"}: ${issue.message}`,
          })),
        };
      },
      jsonSchema: {
        input: () => record.inputSchema,
        output: () => record.inputSchema,
      },
    },
  } as Schema;
}

export function buildGkitSchema(manifest: LoadedExecutableManifest): Router {
  const [bulkRanks] = manifest.document.capabilities;
  if (!bulkRanks || manifest.document.capabilities.length !== 1) {
    throw new GkitFailure({
      code: "INTERNAL_ERROR",
      message: "The Slice 1 schema renderer requires exactly one reviewed capability.",
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
                outcome: v.picklist([
                  "confirmed_charged",
                  "confirmed_not_charged",
                ]),
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
            description: "Check readiness without a network probe: gkit --profile <app> dataforseo doctor.",
            examples: ["gkit --profile app-a dataforseo doctor"],
          })
          .input(s(v.strictObject({}))),
        api: group(
          { description: "Call a reviewed native DataForSEO operation." },
          {
            call: c
              .meta({
                description: bulkRanks.description,
                examples: bulkRanks.examples.map((example) => example.command),
              })
              .input(schemaFromManifest(bulkRanks)),
          },
        ),
      },
    ),
  };
}

export function renderGkitSchema(
  manifest: LoadedExecutableManifest,
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
    selected = selectSchema(root, selector, { depth: 4 });
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
  manifest: LoadedExecutableManifest,
): string {
  const callExample = manifest.document.capabilities[0]?.examples[0]?.command;
  return generated
    .replace(
      /gkit describe "\{ id: 'value' \}"/g,
      "gkit describe --id <capability-id>",
    )
    .replace(
      /gkit docs "\{ provider: 'value' \}"/g,
      "gkit docs --provider <provider>",
    )
    .replace(
      /gkit ledger\.reconcile "[^"]*"/g,
      "gkit ledger reconcile --attempt <id> --outcome <outcome> --evidence-ref <ref> [--cost-usd <decimal>]",
    )
    .replace(
      /gkit dataforseo\.api\.call "[^"]*"/g,
      callExample ??
        "gkit --profile <app> dataforseo api call --operation-id <id> --input @request.json --allow-spend --max-spend-usd <decimal> --out <path>",
    );
}
