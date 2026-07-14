import type { LoadedExecutableManifest, ManifestRecord } from "./manifest";

export function renderProviderDocs(manifest: LoadedExecutableManifest): string {
  const lines = [
    "---",
    "type: Reference",
    "title: DataForSEO reviewed executable capabilities",
    "description: >",
    "  Generated, searchable documentation for the reviewed DataForSEO operations",
    "  that gkit is allowed to route and execute.",
    `provider: ${manifest.document.provider}`,
    `manifestRevision: ${manifest.document.revision}`,
    "---",
    "",
    "# DataForSEO reviewed executable capabilities",
    "",
    "This file is byte-stably rendered from `generated/dataforseo/manifest.json`.",
    "The committed manifest remains the only runtime, validation, effect, cost, and discovery source.",
    "",
  ];

  for (const record of manifest.document.capabilities) {
    lines.push(...renderCapability(record));
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

function renderCapability(record: ManifestRecord): string[] {
  const lines = [
    `## ${record.id}`,
    "",
    record.description,
    "",
    `- Provider: \`${record.provider}\``,
    `- Adapter key: \`${record.adapterKey}\``,
    `- Capability revision: \`${record.revision}\``,
    `- Effects: ${record.effects.map((effect) => `\`${effect}\``).join(", ")}`,
  ];

  if (record.cost) {
    lines.push(
      `- Cost-policy revision: \`${record.cost.policyRevision}\``,
      `- Conservative cost model: \`${record.cost.model.baseMicros}\` base micros + \`${record.cost.model.perItemMicros}\` micros per item at \`${record.cost.model.itemsJsonPointer}\` (max \`${record.cost.model.maxItems}\`)`,
    );
  }

  lines.push("", "### Input schema", "", "```json");
  lines.push(JSON.stringify(record.inputSchema, null, 2));
  lines.push("```", "", "### Invocation", "");
  for (const example of record.examples) {
    if (example.title) lines.push(`#### ${example.title}`, "");
    lines.push("```bash", example.command, "```", "");
  }
  return lines;
}
