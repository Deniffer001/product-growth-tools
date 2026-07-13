/**
 * @input process env, invocation directory env files, and business profile env files
 * @output profile-first env loading metadata and profile-relative path resolution
 * @pos shared credential profile runtime for gkit CLIs
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, parse as parsePath, resolve } from "node:path";
import { config, parse } from "dotenv";

export type EnvLoader = (input: { path: string; override?: boolean; quiet?: boolean }) => unknown;

export type ProductGrowthProfileMetadata = {
  profile?: string;
  profileRoot?: string;
  profileDir?: string;
  profileEnvPath?: string;
  profileEnvFound: boolean;
  invocationRoot: string;
  invocationEnvPaths: string[];
};

const DEFAULT_ENV_FILES = [".env.local", ".env"];
const PROFILE_KEYS = ["PRODUCT_GROWTH_PROFILE", "PRODUCT_GROWTH_PROFILE_ROOT"];

export function getInvocationRoot() {
  return process.env.INIT_CWD ?? process.env.PWD ?? process.cwd();
}

export function defaultProfileRoot(profile?: string) {
  const home = process.env.HOME ?? homedir();
  const primaryRoot = resolve(home, ".config/gkit/profiles");
  if (!profile || existsSync(resolve(primaryRoot, profile))) {
    return primaryRoot;
  }

  const legacyRoot = resolve(home, ".config/product-growth-tools/profiles");
  return existsSync(resolve(legacyRoot, profile)) ? legacyRoot : primaryRoot;
}

export function resolveInvocationEnvPaths(invocationRoot = getInvocationRoot()) {
  const roots = [invocationRoot];
  const workspaceRoot = findWorkspaceRoot(invocationRoot);
  if (workspaceRoot && workspaceRoot !== invocationRoot) {
    roots.push(workspaceRoot);
  }

  return roots.flatMap((root) => DEFAULT_ENV_FILES.map((name) => resolve(root, name)));
}

export function loadProductGrowthEnv(loadEnv: EnvLoader = config): ProductGrowthProfileMetadata {
  const invocationRoot = getInvocationRoot();
  const invocationEnvPaths = resolveInvocationEnvPaths(invocationRoot);

  loadProfileSelectorFromInvocationEnv(invocationEnvPaths);

  const profile = process.env.PRODUCT_GROWTH_PROFILE;
  const profileRoot = process.env.PRODUCT_GROWTH_PROFILE_ROOT ?? defaultProfileRoot(profile);
  const profileDir = profile ? resolve(profileRoot, profile) : undefined;
  const profileEnvPath = profileDir ? resolve(profileDir, ".env") : undefined;
  const profileEnvFound = Boolean(profileEnvPath && existsSync(profileEnvPath));

  if (profileEnvPath && profileEnvFound) {
    process.env.PRODUCT_GROWTH_PROFILE_DIR ??= dirname(profileEnvPath);
    loadEnv({ path: profileEnvPath, override: false, quiet: true });
  }

  for (const path of invocationEnvPaths) {
    if (!existsSync(path)) {
      continue;
    }
    loadEnv({ path, override: false, quiet: true });
  }

  return {
    profile,
    profileRoot: profile ? profileRoot : undefined,
    profileDir,
    profileEnvPath,
    profileEnvFound,
    invocationRoot,
    invocationEnvPaths,
  };
}

export function resolveInvocationPath(path: string) {
  if (isAbsolute(path)) {
    return path;
  }

  return resolve(getInvocationRoot(), path);
}

export function resolveProfilePath(path: string) {
  if (isAbsolute(path)) {
    return path;
  }

  const profileDir = process.env.PRODUCT_GROWTH_PROFILE_DIR;
  if (profileDir) {
    return resolve(profileDir, path);
  }

  return resolveInvocationPath(path);
}

export function getActiveProfileMetadata(): ProductGrowthProfileMetadata {
  const invocationRoot = getInvocationRoot();
  const invocationEnvPaths = resolveInvocationEnvPaths(invocationRoot);
  const profile = process.env.PRODUCT_GROWTH_PROFILE;
  const profileRoot = profile
    ? (process.env.PRODUCT_GROWTH_PROFILE_ROOT ?? defaultProfileRoot(profile))
    : undefined;
  const profileDir =
    process.env.PRODUCT_GROWTH_PROFILE_DIR ??
    (profile && profileRoot ? resolve(profileRoot, profile) : undefined);
  const profileEnvPath = profileDir ? resolve(profileDir, ".env") : undefined;

  return {
    profile,
    profileRoot,
    profileDir,
    profileEnvPath,
    profileEnvFound: Boolean(profileEnvPath && existsSync(profileEnvPath)),
    invocationRoot,
    invocationEnvPaths,
  };
}

function loadProfileSelectorFromInvocationEnv(paths: string[]) {
  for (const path of paths) {
    if (!existsSync(path)) {
      continue;
    }

    const parsed = parse(readFileSync(path));
    for (const key of PROFILE_KEYS) {
      if (process.env[key] || !parsed[key]) {
        continue;
      }
      process.env[key] = parsed[key];
    }
  }
}

function findWorkspaceRoot(start: string) {
  let current = start;
  const { root } = parsePath(start);

  while (true) {
    if (existsSync(resolve(current, ".git"))) {
      return current;
    }

    const packageJsonPath = resolve(current, "package.json");
    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
          workspaces?: unknown;
        };
        if (packageJson.workspaces) {
          return current;
        }
      } catch {
        return undefined;
      }
    }

    if (current === root) {
      return undefined;
    }

    current = dirname(current);
  }
}
