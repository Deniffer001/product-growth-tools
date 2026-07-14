import { describe, expect, it } from "vitest";

import { generateDataForSeoArtifacts } from "./generate-dataforseo";

const packageRoot = new URL("..", import.meta.url).pathname;

describe("DataForSEO artifact generator", () => {
  it("projects one pinned source and reviewed policy into executable and inventory surfaces", async () => {
    const first = await generateDataForSeoArtifacts(packageRoot);
    const second = await generateDataForSeoArtifacts(packageRoot);

    expect(second).toEqual(first);

    const manifest = JSON.parse(first.manifest) as {
      capabilities: Array<{ id: string }>;
    };
    const inventory = JSON.parse(first.inventory) as {
      operations: Array<{
        operationId: string;
        exposure: "executable" | "inventory";
        reason: string;
      }>;
    };

    expect(manifest.capabilities.map((record) => record.id)).toEqual([
      "dataforseo.backlinks.bulk_ranks.live",
      "dataforseo.backlinks.referring_domains.live",
      "dataforseo.backlinks.summary.live",
      "dataforseo.serp.google.organic.live.advanced",
    ]);
    expect(inventory.operations).toContainEqual(
      expect.objectContaining({
        operationId: "LlmMentionsSearchLive",
        exposure: "inventory",
        reason: expect.stringContaining("0.03"),
      }),
    );
    expect(first.inventoryDocs).toContain(
      "`LlmMentionsSearchLive` | `inventory` | The reviewed minimum request price is USD 0.10",
    );
  });
});
