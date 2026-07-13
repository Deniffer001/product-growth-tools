/**
 * @input temporary invocation and profile env files
 * @output contract coverage for profile-first env loading and path resolution
 * @pos tests for shared product-growth profile runtime
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { loadProductGrowthEnv, resolveProfilePath } from "./profile";

const ENV_KEYS = [
  "PRODUCT_GROWTH_PROFILE",
  "PRODUCT_GROWTH_PROFILE_ROOT",
  "PRODUCT_GROWTH_PROFILE_DIR",
  "GSC_CREDENTIALS_FILE",
  "GSC_SITE_URL",
];
const originalPwd = process.env.PWD;
const originalHome = process.env.HOME;

describe("product growth profile runtime", () => {
  afterEach(() => {
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
    delete process.env.INIT_CWD;
    if (originalPwd) {
      process.env.PWD = originalPwd;
    } else {
      delete process.env.PWD;
    }
    if (originalHome) {
      process.env.HOME = originalHome;
    } else {
      delete process.env.HOME;
    }
  });

  test("uses repo env only to discover profile before loading profile env", () => {
    const root = mkdtempSync(join(tmpdir(), "product-growth-runtime-root-"));
    const profiles = mkdtempSync(join(tmpdir(), "product-growth-runtime-profiles-"));
    const profileDir = join(profiles, "openclaw-web");
    mkdirSync(profileDir);
    writeFileSync(
      join(root, ".env.local"),
      [
        "PRODUCT_GROWTH_PROFILE=openclaw-web",
        `PRODUCT_GROWTH_PROFILE_ROOT=${profiles}`,
        "GSC_SITE_URL=sc-domain:repo-fallback",
      ].join("\n"),
    );
    writeFileSync(
      join(profileDir, ".env"),
      "GSC_SITE_URL=sc-domain:profile\nGSC_CREDENTIALS_FILE=./credentials/gsc.json\n",
    );
    process.env.INIT_CWD = root;

    const metadata = loadProductGrowthEnv();

    expect(metadata.profile).toBe("openclaw-web");
    expect(process.env.GSC_SITE_URL).toBe("sc-domain:profile");
    expect(resolveProfilePath(process.env.GSC_CREDENTIALS_FILE!)).toBe(
      join(profileDir, "credentials/gsc.json"),
    );

    rmSync(root, { force: true, recursive: true });
    rmSync(profiles, { force: true, recursive: true });
  });

  test("falls back to the legacy profile root when the gkit profile is absent", () => {
    const root = mkdtempSync(join(tmpdir(), "gkit-runtime-root-"));
    const home = mkdtempSync(join(tmpdir(), "gkit-runtime-home-"));
    const profileDir = join(home, ".config/product-growth-tools/profiles/openclaw-web");
    mkdirSync(profileDir, { recursive: true });
    writeFileSync(join(root, ".env.local"), "PRODUCT_GROWTH_PROFILE=openclaw-web\n");
    writeFileSync(join(profileDir, ".env"), "GSC_SITE_URL=sc-domain:legacy\n");
    process.env.HOME = home;
    process.env.INIT_CWD = root;

    const metadata = loadProductGrowthEnv();

    expect(metadata.profileRoot).toBe(join(home, ".config/product-growth-tools/profiles"));
    expect(metadata.profileDir).toBe(profileDir);
    expect(process.env.GSC_SITE_URL).toBe("sc-domain:legacy");

    rmSync(root, { force: true, recursive: true });
    rmSync(home, { force: true, recursive: true });
  });

  test("prefers the gkit profile root when both profile locations exist", () => {
    const root = mkdtempSync(join(tmpdir(), "gkit-runtime-root-"));
    const home = mkdtempSync(join(tmpdir(), "gkit-runtime-home-"));
    const gkitProfileDir = join(home, ".config/gkit/profiles/openclaw-web");
    const legacyProfileDir = join(home, ".config/product-growth-tools/profiles/openclaw-web");
    mkdirSync(gkitProfileDir, { recursive: true });
    mkdirSync(legacyProfileDir, { recursive: true });
    writeFileSync(join(root, ".env.local"), "PRODUCT_GROWTH_PROFILE=openclaw-web\n");
    writeFileSync(join(gkitProfileDir, ".env"), "GSC_SITE_URL=sc-domain:gkit\n");
    writeFileSync(join(legacyProfileDir, ".env"), "GSC_SITE_URL=sc-domain:legacy\n");
    process.env.HOME = home;
    process.env.INIT_CWD = root;

    const metadata = loadProductGrowthEnv();

    expect(metadata.profileRoot).toBe(join(home, ".config/gkit/profiles"));
    expect(metadata.profileDir).toBe(gkitProfileDir);
    expect(process.env.GSC_SITE_URL).toBe("sc-domain:gkit");

    rmSync(root, { force: true, recursive: true });
    rmSync(home, { force: true, recursive: true });
  });

  test("keeps explicit process env ahead of profile env", () => {
    const root = mkdtempSync(join(tmpdir(), "product-growth-runtime-root-"));
    const profiles = mkdtempSync(join(tmpdir(), "product-growth-runtime-profiles-"));
    const profileDir = join(profiles, "openclaw-web");
    mkdirSync(profileDir);
    writeFileSync(
      join(root, ".env.local"),
      `PRODUCT_GROWTH_PROFILE=openclaw-web\nPRODUCT_GROWTH_PROFILE_ROOT=${profiles}\n`,
    );
    writeFileSync(join(profileDir, ".env"), "GSC_SITE_URL=sc-domain:profile\n");
    process.env.INIT_CWD = root;
    process.env.GSC_SITE_URL = "sc-domain:explicit";

    loadProductGrowthEnv();

    expect(process.env.GSC_SITE_URL).toBe("sc-domain:explicit");

    rmSync(root, { force: true, recursive: true });
    rmSync(profiles, { force: true, recursive: true });
  });

  test("uses PWD as invocation root when INIT_CWD is absent", () => {
    const root = mkdtempSync(join(tmpdir(), "product-growth-runtime-root-"));
    const profiles = mkdtempSync(join(tmpdir(), "product-growth-runtime-profiles-"));
    const profileDir = join(profiles, "openclaw-web");
    mkdirSync(profileDir);
    writeFileSync(
      join(root, ".env.local"),
      `PRODUCT_GROWTH_PROFILE=openclaw-web\nPRODUCT_GROWTH_PROFILE_ROOT=${profiles}\n`,
    );
    writeFileSync(join(profileDir, ".env"), "GSC_SITE_URL=sc-domain:profile\n");
    delete process.env.INIT_CWD;
    process.env.PWD = root;

    loadProductGrowthEnv();

    expect(process.env.PRODUCT_GROWTH_PROFILE).toBe("openclaw-web");
    expect(process.env.GSC_SITE_URL).toBe("sc-domain:profile");

    rmSync(root, { force: true, recursive: true });
    rmSync(profiles, { force: true, recursive: true });
  });

  test("falls back to workspace root env when command cwd is a package", () => {
    const root = mkdtempSync(join(tmpdir(), "product-growth-runtime-root-"));
    const packageDir = join(root, "packages/gsc-cli");
    const profiles = mkdtempSync(join(tmpdir(), "product-growth-runtime-profiles-"));
    const profileDir = join(profiles, "openclaw-web");
    mkdirSync(packageDir, { recursive: true });
    mkdirSync(profileDir);
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ private: true, workspaces: { packages: ["packages/*"] } }),
    );
    writeFileSync(
      join(root, ".env.local"),
      `PRODUCT_GROWTH_PROFILE=openclaw-web\nPRODUCT_GROWTH_PROFILE_ROOT=${profiles}\n`,
    );
    writeFileSync(join(profileDir, ".env"), "GSC_SITE_URL=sc-domain:profile\n");
    delete process.env.INIT_CWD;
    process.env.PWD = packageDir;

    loadProductGrowthEnv();

    expect(process.env.PRODUCT_GROWTH_PROFILE).toBe("openclaw-web");
    expect(process.env.GSC_SITE_URL).toBe("sc-domain:profile");

    rmSync(root, { force: true, recursive: true });
    rmSync(profiles, { force: true, recursive: true });
  });
});
