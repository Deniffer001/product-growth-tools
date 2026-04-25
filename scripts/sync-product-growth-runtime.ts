/**
 * @input shared product-growth runtime source file
 * @output vendored runtime copies inside publishable CLI packages
 * @pos maintenance helper that avoids publishing an internal runtime package
 */

import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const profileSource = resolve(
  repoRoot,
  "packages/shared/product-growth-runtime/profile.ts"
);
const profileTargets = [
  "packages/gsc-cli/lib/product-growth-runtime/profile.ts",
  "packages/google-ads-cli/lib/product-growth-runtime/profile.ts",
].map((path) => resolve(repoRoot, path));

for (const target of profileTargets) {
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(profileSource, target);
  console.log(`synced ${target}`);
}
