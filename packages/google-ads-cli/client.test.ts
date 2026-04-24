/**
 * @input CLI context resolver plus temporary environment values
 * @output coverage for auth and customer fallback resolution
 * @pos client resolution tests for Google Ads CLI
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { createCliContext, loadDefaultCliEnv } from "./client";

describe("google-ads client resolution", () => {
  afterEach(() => {
    delete process.env.PRODUCT_GROWTH_PROFILE;
    delete process.env.PRODUCT_GROWTH_PROFILE_DIR;
    delete process.env.PRODUCT_GROWTH_PROFILE_ROOT;
    delete process.env.GOOGLE_ADS_JSON_KEY_FILE_PATH;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.GOOGLE_ADS_SERVICE_ACCOUNT_JSON;
    delete process.env.GOOGLE_ADS_CUSTOMER_ID;
    delete process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
    delete process.env.GOOGLE_ADS_LINKED_CUSTOMER_ID;
    delete process.env.INIT_CWD;
  });

  test("prefers explicit credentials file over env default", () => {
    process.env.GOOGLE_ADS_JSON_KEY_FILE_PATH = "/tmp/env-google-ads.json";

    expect(
      createCliContext({ credentialsFile: "/tmp/flag-google-ads.json" })
        .credentialsFile
    ).toBe("/tmp/flag-google-ads.json");
  });

  test("prefers explicit customer id over env default", () => {
    process.env.GOOGLE_ADS_CUSTOMER_ID = "1111111111";

    expect(createCliContext({ customerId: "2222222222" }).customerId).toBe(
      "2222222222"
    );
  });

  test("falls back to login customer env", () => {
    process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID = "3333333333";

    expect(createCliContext({}).loginCustomerId).toBe("3333333333");
  });

  test("reads linked customer env", () => {
    process.env.GOOGLE_ADS_LINKED_CUSTOMER_ID = "4444444444";

    expect(createCliContext({}).linkedCustomerId).toBe("4444444444");
  });

  test("reads inline service account json from env", () => {
    process.env.GOOGLE_ADS_SERVICE_ACCOUNT_JSON = '{"type":"service_account"}';

    expect(createCliContext({}).credentialsJson).toBe(
      '{"type":"service_account"}'
    );
  });

  test("resolves profile credentials path from profile directory", () => {
    process.env.PRODUCT_GROWTH_PROFILE_DIR = "/profiles/openclaw-web";
    process.env.GOOGLE_ADS_JSON_KEY_FILE_PATH = "./credentials/google-ads.json";

    expect(createCliContext({}).credentialsFile).toBe(
      "/profiles/openclaw-web/credentials/google-ads.json"
    );
  });

  test("resolves relative credentials path from invocation root", () => {
    process.env.INIT_CWD = "/repo";

    expect(
      createCliContext({
        credentialsFile: "packages/google-ads-cli/credentials/test.json",
      }).credentialsFile
    ).toBe("/repo/packages/google-ads-cli/credentials/test.json");
  });

  test("loads env files from invocation root", () => {
    const loadedPaths: string[] = [];
    const root = mkdtempSync(join(tmpdir(), "google-ads-cli-env-"));
    process.env.INIT_CWD = root;
    writeFileSync(join(root, ".env.local"), "GOOGLE_ADS_CUSTOMER_ID=123\n");
    writeFileSync(join(root, ".env"), "GOOGLE_ADS_CUSTOMER_ID=456\n");

    loadDefaultCliEnv((input) => {
      loadedPaths.push(input.path);
    });

    expect(loadedPaths).toEqual([join(root, ".env.local"), join(root, ".env")]);
    rmSync(root, { force: true, recursive: true });
  });

  test("loads business profile env before invocation env files", () => {
    const loadedPaths: string[] = [];
    const root = mkdtempSync(join(tmpdir(), "google-ads-cli-env-"));
    const profiles = mkdtempSync(join(tmpdir(), "product-growth-profiles-"));
    const profileDir = join(profiles, "openclaw-web");
    process.env.INIT_CWD = root;
    process.env.PRODUCT_GROWTH_PROFILE = "openclaw-web";
    process.env.PRODUCT_GROWTH_PROFILE_ROOT = profiles;
    mkdirSync(profileDir);
    writeFileSync(join(profileDir, ".env"), "GOOGLE_ADS_CUSTOMER_ID=123\n");
    writeFileSync(join(root, ".env.local"), "GOOGLE_ADS_CUSTOMER_ID=456\n");

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
