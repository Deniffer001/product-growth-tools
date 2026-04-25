/**
 * @input shared product-growth runtime source files
 * @output vendored runtime copies inside publishable CLI packages
 * @pos maintenance helper that avoids publishing an internal runtime package
 */

import { cpSync, copyFileSync, mkdirSync, rmSync } from "node:fs";
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

const argcSource = resolve(repoRoot, "packages/shared/argc-runtime");
const argcTargets = [
  "packages/gsc-cli/lib/argc",
  "packages/google-ads-cli/lib/argc",
  "packages/page-extract-cli/lib/argc",
  "packages/serp-snapshot-cli/lib/argc",
  "packages/sitemap-watch-cli/lib/argc",
].map((path) => resolve(repoRoot, path));

for (const target of argcTargets) {
  rmSync(target, { recursive: true, force: true });
  mkdirSync(dirname(target), { recursive: true });
  cpSync(argcSource, target, { recursive: true });
  console.log(`synced ${target}`);
}
