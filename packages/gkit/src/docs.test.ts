import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

import { renderProviderDocs } from "./docs";
import { loadExecutableManifest } from "./manifest";

describe("provider docs", () => {
  it("are a byte-stable projection of the executable manifest", async () => {
    const manifest = await loadExecutableManifest(
      new URL("../generated/dataforseo/manifest.json", import.meta.url).pathname,
    );
    const committed = await readFile(
      new URL("../docs/providers/dataforseo/backlinks.md", import.meta.url),
      "utf8",
    );

    expect(committed).toBe(renderProviderDocs(manifest));
  });
});
