/**
 * @input shared product-growth runtime source and vendored CLI copies
 * @output drift guard that keeps publishable CLI packages aligned
 * @pos release safety test for non-published shared runtime code
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const repoRoot = resolve(import.meta.dirname, "../..");

function read(path: string) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("vendored product-growth runtime", () => {
  test("CLI copies match shared source", () => {
    const shared = read("packages/shared/product-growth-runtime/profile.ts");
    const packagesRoot = resolve(repoRoot, "packages");
    const targets = readdirSync(packagesRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.endsWith("-cli"))
      .map((entry) => `packages/${entry.name}/lib/product-growth-runtime/profile.ts`)
      .filter((path) => existsSync(resolve(repoRoot, path)));

    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) {
      expect(read(target), target).toBe(shared);
    }
  });
});
