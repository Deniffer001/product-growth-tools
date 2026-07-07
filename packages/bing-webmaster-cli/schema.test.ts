/**
 * @input spawned CLI process and schema inspection arguments
 * @output coverage for discoverable command-tree shape and selector detail
 * @pos schema contract tests for Bing Webmaster CLI
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

describe("bing webmaster cli schema", () => {
  test("groups commands by provider domain before intent", { timeout: 15_000 }, () => {
    const result = runCli(["--schema"]);

    expect(result.status).toBe(0);
    expect(extractOutline(result.stdout)).toEqual([
      "doctor{dataset{readiness}}",
      "site{dataset{sites}}",
      "traffic{dataset{rank,queries,pages},entity{query,pageQueries,queryPages,queryPage}}",
      "crawl{dataset{stats,issues},entity{settings}}",
      "link{dataset{pages},entity{url}}",
      "sitemap{dataset{feeds},entity{feed}}",
      "url{entity{info,traffic}}",
    ]);
  });

  test("exposes traffic and URL selectors", () => {
    const rank = runCli(["--schema=.traffic.dataset.rank"]);
    const queryPage = runCli(["--schema=.traffic.entity.queryPage"]);
    const urlInfo = runCli(["--schema=.url.entity.info"]);

    expect(rank.status).toBe(0);
    expect(rank.stdout).toContain("rank(");
    expect(rank.stdout).toContain("siteUrl?: string");

    expect(queryPage.status).toBe(0);
    expect(queryPage.stdout).toContain("queryPage(");
    expect(queryPage.stdout).toContain("query: string");
    expect(queryPage.stdout).toContain("pageUrl: string");

    expect(urlInfo.status).toBe(0);
    expect(urlInfo.stdout).toContain("info(");
    expect(urlInfo.stdout).toContain("url: string");
  });

  test("accepts numeric page flags without schema rejection", () => {
    const result = runCli(
      [
        "link",
        "dataset",
        "pages",
        "--site-url",
        "https://example.com/",
        "--page",
        "3",
      ],
      {
        ...process.env,
        PRODUCT_GROWTH_PROFILE: "__test_profile_disabled__",
        PRODUCT_GROWTH_PROFILE_ROOT: "/tmp/product-growth-test-profiles",
        PRODUCT_GROWTH_PROFILE_DIR: "",
        BING_WEBMASTER_API_KEY: "",
        BING_WEBMASTER_SITE_URL: "",
      }
    );

    expect(result.status).toBe(1);
    expect(result.stdout).not.toContain("Expected number but received");
    expect(result.stderr).toContain("Missing Bing Webmaster API key.");
  });
});
