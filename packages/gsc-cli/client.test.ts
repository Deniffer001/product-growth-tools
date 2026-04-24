/**
 * @input CLI context resolver plus temporary environment values
 * @output coverage for auth and site fallback resolution
 * @pos client resolution tests for GSC CLI
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { createCliContext, loadDefaultCliEnv } from "./client";

describe("gsc client resolution", () => {
  afterEach(() => {
    delete process.env.PRODUCT_GROWTH_PROFILE;
    delete process.env.PRODUCT_GROWTH_PROFILE_DIR;
    delete process.env.PRODUCT_GROWTH_PROFILE_ROOT;
    delete process.env.GSC_SITE_URL;
    delete process.env.GSC_CREDENTIALS_FILE;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.GSC_SERVICE_ACCOUNT_JSON;
    delete process.env.INIT_CWD;
  });

  test("prefers explicit site url over env defaults", () => {
    process.env.GSC_SITE_URL = "sc-domain:env.example";

    expect(
      createCliContext({
        siteUrl: "sc-domain:flag.example",
      }).siteUrl
    ).toBe("sc-domain:flag.example");
  });

  test("falls back to google application credentials", () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = "/tmp/gsc.json";

    expect(createCliContext({}).credentialsFile).toBe("/tmp/gsc.json");
  });

  test("resolves relative credentials path from invocation root", () => {
    process.env.INIT_CWD = "/repo";
    process.env.GSC_CREDENTIALS_FILE = "credentials/gsc.json";

    expect(createCliContext({}).credentialsFile).toBe(
      "/repo/credentials/gsc.json"
    );
  });

  test("reads inline service account json from env", () => {
    process.env.GSC_SERVICE_ACCOUNT_JSON = '{"type":"service_account"}';

    expect(createCliContext({}).credentialsJson).toBe(
      '{"type":"service_account"}'
    );
  });

  test("resolves profile credentials path from profile directory", () => {
    process.env.PRODUCT_GROWTH_PROFILE_DIR = "/profiles/openclaw-web";
    process.env.GSC_CREDENTIALS_FILE = "./credentials/gsc.json";

    expect(createCliContext({}).credentialsFile).toBe(
      "/profiles/openclaw-web/credentials/gsc.json"
    );
  });

  test("loads env files from invocation root", () => {
    const loadedPaths: string[] = [];
    const root = mkdtempSync(join(tmpdir(), "gsc-cli-env-"));
    process.env.INIT_CWD = root;
    writeFileSync(join(root, ".env.local"), "GSC_SITE_URL=sc-domain:test\n");
    writeFileSync(join(root, ".env"), "GSC_SITE_URL=sc-domain:fallback\n");

    loadDefaultCliEnv((input) => {
      loadedPaths.push(input.path);
    });

    expect(loadedPaths).toEqual([join(root, ".env.local"), join(root, ".env")]);
    rmSync(root, { force: true, recursive: true });
  });

  test("loads business profile env before invocation env files", () => {
    const loadedPaths: string[] = [];
    const root = mkdtempSync(join(tmpdir(), "gsc-cli-env-"));
    const profiles = mkdtempSync(join(tmpdir(), "product-growth-profiles-"));
    const profileDir = join(profiles, "openclaw-web");
    process.env.INIT_CWD = root;
    process.env.PRODUCT_GROWTH_PROFILE = "openclaw-web";
    process.env.PRODUCT_GROWTH_PROFILE_ROOT = profiles;
    mkdirSync(profileDir);
    writeFileSync(join(profileDir, ".env"), "GSC_SITE_URL=sc-domain:profile\n");
    writeFileSync(join(root, ".env.local"), "GSC_SITE_URL=sc-domain:local\n");

    loadDefaultCliEnv((input) => {
      loadedPaths.push(input.path);
    });

    expect(loadedPaths).toEqual([
      join(profileDir, ".env"),
      join(root, ".env.local"),
    ]);
    expect(process.env.PRODUCT_GROWTH_PROFILE_DIR).toBe(profileDir);
    rmSync(root, { force: true, recursive: true });
    rmSync(profiles, { force: true, recursive: true });
  });
});
