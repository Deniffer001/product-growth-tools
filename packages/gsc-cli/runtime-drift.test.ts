/**
 * @input shared product-growth runtime source and vendored CLI copies
 * @output drift guard that keeps publishable CLI packages aligned
 * @pos release safety test for non-published shared runtime code
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const repoRoot = resolve(import.meta.dirname, "../..");

function read(path: string) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("vendored product-growth runtime", () => {
  test("CLI copies match shared source", () => {
    const shared = read("packages/shared/product-growth-runtime/profile.ts");

    expect(read("packages/gsc-cli/lib/product-growth-runtime/profile.ts")).toBe(
      shared
    );
    expect(
      read("packages/google-ads-cli/lib/product-growth-runtime/profile.ts")
    ).toBe(shared);
  });
});
