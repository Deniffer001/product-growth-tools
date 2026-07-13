/**
 * @input shared product-growth runtime source file
 * @output vendored runtime copies inside publishable CLI packages
 * @pos maintenance helper that avoids publishing an internal runtime package
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const profileSource = resolve(repoRoot, "packages/shared/product-growth-runtime/profile.ts");
const packagesRoot = resolve(repoRoot, "packages");
const profileTargets = readdirSync(packagesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.endsWith("-cli"))
  .map((entry) => resolve(packagesRoot, entry.name, "lib/product-growth-runtime/profile.ts"))
  .filter(existsSync);

for (const target of profileTargets) {
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(profileSource, target);
  console.log(`synced ${target}`);
}
