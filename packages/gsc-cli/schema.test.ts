/**
 * @input spawned CLI process and schema inspection arguments
 * @output coverage for discoverable command-tree shape and selector detail
 * @pos schema contract tests for GSC CLI
 */

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const cliDir = dirname(fileURLToPath(import.meta.url));

function stripAnsi(text: string) {
  let output = "";
  let index = 0;

  while (index < text.length) {
    const char = text[index];

    if (char === "\u001B" && text[index + 1] === "[") {
      index += 2;
      while (index < text.length) {
        const code = text.charCodeAt(index);
        index += 1;

        if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
          break;
        }
      }
      continue;
    }

    output += char;
    index += 1;
  }

  return output;
}

function runCli(args: string[], env?: NodeJS.ProcessEnv) {
  const result = spawnSync("bun", ["run", "./index.ts", ...args], {
    cwd: resolve(cliDir),
    encoding: "utf8",
    env: env ?? process.env,
  });

  return {
    ...result,
    stdout: stripAnsi(result.stdout),
    stderr: stripAnsi(result.stderr),
  };
}

function extractOutline(stdout: string) {
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !line.startsWith("Schema too large") &&
        !line.startsWith("hint:")
    );
}

describe("gsc cli schema", () => {
  test("groups commands by domain before intent", () => {
    const result = runCli(["--schema"]);

    expect(result.status).toBe(0);
    expect(extractOutline(result.stdout)).toEqual([
      "skill{path,print,install}",
      "doctor{dataset{readiness}}",
      "inspection{entity{url}}",
      "property{dataset{sites}}",
      "sitemap{entity{sitemap},dataset{sitemaps}}",
      "search{dataset{analytics}}",
    ]);
  });

  test("exposes readiness doctor selector", () => {
    const result = runCli(["--schema=.doctor.dataset.readiness"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("readiness(");
  });

  test("exposes skill install selector", () => {
    const result = runCli(["--schema=.skill.install"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("install(");
    expect(result.stdout).toContain("skill?: string");
    expect(result.stdout).toContain("force?: boolean");
  });

  test("exposes analytics dataset with agent-friendly flags", () => {
    const result = runCli(["--schema=.search.dataset.analytics"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("analytics(");
    expect(result.stdout).toContain("startDate: string");
    expect(result.stdout).toContain("endDate: string");
    expect(result.stdout).toContain("filterOperator?:");
  });

  test("exposes sitemap and inspection selectors", () => {
    const sitemap = runCli(["--schema=.sitemap.dataset.sitemaps"]);
    const inspection = runCli(["--schema=.inspection.entity.url"]);

    expect(sitemap.status).toBe(0);
    expect(sitemap.stdout).toContain("sitemaps(");
    expect(sitemap.stdout).toContain("sitemapIndex?: string");

    expect(inspection.status).toBe(0);
    expect(inspection.stdout).toContain("url(");
    expect(inspection.stdout).toContain("inspectionUrl: string");
  });

  test("accepts numeric flags from argv without schema rejection", () => {
    const result = runCli(
      [
        "search",
        "dataset",
        "analytics",
        "--site-url",
        "sc-domain:example.com",
        "--start-date",
        "2026-04-01",
        "--end-date",
        "2026-04-07",
        "--rowLimit",
        "3",
        "--startRow",
        "0",
      ],
      {
        ...process.env,
        PRODUCT_GROWTH_PROFILE: "__test_profile_disabled__",
        PRODUCT_GROWTH_PROFILE_ROOT: "/tmp/product-growth-test-profiles",
        PRODUCT_GROWTH_PROFILE_DIR: "",
        GOOGLE_APPLICATION_CREDENTIALS: "",
        GSC_CREDENTIALS_FILE: "",
        GSC_SERVICE_ACCOUNT_JSON: "",
        GSC_SITE_URL: "",
      }
    );

    expect(result.status).toBe(1);
    expect(result.stdout).not.toContain("Expected number but received");
    expect(result.stderr).toContain(
      "Missing Google Search Console credentials."
    );
  });
});
