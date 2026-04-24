/**
 * @input spawned CLI process and schema inspection arguments
 * @output coverage for discoverable command-tree shape and selector detail
 * @pos schema contract tests for Google Ads CLI
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

describe("google-ads cli schema", () => {
  test(
    "groups commands by provider domain before intent",
    { timeout: 15_000 },
    () => {
      const result = runCli(["--schema"]);

      expect(result.status).toBe(0);
      expect(extractOutline(result.stdout)).toEqual([
        "adGroup{dataset{performance}}",
        "doctor{dataset{readiness}}",
        "customer{dataset{accounts}}",
        "campaign{dataset{performance}}",
        "searchTerm{dataset{performance}}",
        "keyword{dataset{performance}}",
        "keywordPlan{dataset{ideas,historicalMetrics}}",
        "query{dataset{gaql}}",
      ]);
    }
  );

  test(
    "exposes performance dataset with agent-friendly flags",
    { timeout: 15_000 },
    () => {
      const result = runCli(["--schema=.campaign.dataset.performance"]);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("performance(");
      expect(result.stdout).toContain("startDate: string");
      expect(result.stdout).toContain("endDate: string");
      expect(result.stdout).toContain("limit?:");
    }
  );

  test(
    "accepts numeric flags from argv without schema rejection",
    { timeout: 15_000 },
    () => {
      const result = runCli(
        [
          "campaign",
          "dataset",
          "performance",
          "--customer-id",
          "1234567890",
          "--start-date",
          "2026-04-01",
          "--end-date",
          "2026-04-07",
          "--limit",
          "3",
        ],
        {
          ...process.env,
          GOOGLE_ADS_DEVELOPER_TOKEN: "",
          GOOGLE_ADS_JSON_KEY_FILE_PATH: "",
          GOOGLE_APPLICATION_CREDENTIALS: "",
          GOOGLE_ADS_SERVICE_ACCOUNT_JSON: "",
        }
      );

      expect(result.status).toBe(1);
      expect(result.stdout).not.toContain("Expected number but received");
      expect(result.stderr).toContain(
        "Missing Google Ads service account credentials."
      );
    }
  );

  test("exposes search-term and ad-group datasets", { timeout: 15_000 }, () => {
    const adGroup = runCli(["--schema=.adGroup.dataset.performance"]);
    const searchTerm = runCli(["--schema=.searchTerm.dataset.performance"]);

    expect(adGroup.status).toBe(0);
    expect(adGroup.stdout).toContain("performance(");
    expect(adGroup.stdout).toContain("startDate: string");

    expect(searchTerm.status).toBe(0);
    expect(searchTerm.stdout).toContain("performance(");
    expect(searchTerm.stdout).toContain("endDate: string");
  });

  test("exposes doctor, keyword, and keyword-plan datasets", { timeout: 15_000 }, () => {
    const doctor = runCli(["--schema=.doctor.dataset.readiness"]);
    const keyword = runCli(["--schema=.keyword.dataset.performance"]);
    const keywordPlanIdeas = runCli(["--schema=.keywordPlan.dataset.ideas"]);
    const keywordPlanHistorical = runCli([
      "--schema=.keywordPlan.dataset.historicalMetrics",
    ]);

    expect(doctor.status).toBe(0);
    expect(doctor.stdout).toContain("readiness(");

    expect(keyword.status).toBe(0);
    expect(keyword.stdout).toContain("performance(");
    expect(keyword.stdout).toContain("startDate: string");

    expect(keywordPlanIdeas.status).toBe(0);
    expect(keywordPlanIdeas.stdout).toContain("ideas(");
    expect(keywordPlanIdeas.stdout).toContain("keywords?: string");
    expect(keywordPlanIdeas.stdout).toContain("pageUrl?: string");

    expect(keywordPlanHistorical.status).toBe(0);
    expect(keywordPlanHistorical.stdout).toContain("historicalMetrics(");
    expect(keywordPlanHistorical.stdout).toContain("keywords: string");
  });

  test("exposes keyword planner datasets", { timeout: 15_000 }, () => {
    const ideas = runCli(["--schema=.keywordPlan.dataset.ideas"]);
    const historicalMetrics = runCli([
      "--schema=.keywordPlan.dataset.historicalMetrics",
    ]);

    expect(ideas.status).toBe(0);
    expect(ideas.stdout).toContain("ideas(");
    expect(ideas.stdout).toContain("keywords?: string");
    expect(ideas.stdout).toContain("pageUrl?: string");
    expect(ideas.stdout).toContain("geoTargetIds?: string");
    expect(ideas.stdout).toContain("limit?:");

    expect(historicalMetrics.status).toBe(0);
    expect(historicalMetrics.stdout).toContain("historicalMetrics(");
    expect(historicalMetrics.stdout).toContain("keywords: string");
    expect(historicalMetrics.stdout).toContain("includeAverageCpc?: boolean");
  });

  test(
    "accepts keyword planner numeric flags from argv without schema rejection",
    { timeout: 15_000 },
    () => {
      const result = runCli(
        [
          "keywordPlan",
          "dataset",
          "ideas",
          "--customer-id",
          "1234567890",
          "--keywords",
          "ai browser",
          "--language-id",
          "1000",
          "--geo-target-ids",
          "2840",
          "--limit",
          "3",
        ],
        {
          ...process.env,
          GOOGLE_ADS_DEVELOPER_TOKEN: "",
          GOOGLE_ADS_JSON_KEY_FILE_PATH: "",
          GOOGLE_APPLICATION_CREDENTIALS: "",
          GOOGLE_ADS_SERVICE_ACCOUNT_JSON: "",
        }
      );

      expect(result.status).toBe(1);
      expect(result.stdout).not.toContain("Expected number but received");
      expect(result.stderr).toContain(
        "Missing Google Ads service account credentials."
      );
    }
  );
});
