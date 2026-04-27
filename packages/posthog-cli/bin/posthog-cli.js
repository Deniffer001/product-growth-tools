#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync("bun", ["run", resolve(packageRoot, "index.ts"), ...process.argv.slice(2)], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
