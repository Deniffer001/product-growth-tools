/**
 * @input BDD scenarios for reproducible PostHog query artifact runs
 * @output coverage for request validation, artifact files, hashes, and boundary guards
 * @pos executable behavior contract for query action run
 */

import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import type { CliContext } from "../context";
import type { PostHogClient, QueryRunRequest } from "../provider";
import {
  runPostHogQueryArtifact,
  type ProviderQueryRequest,
} from "./query-action";

function createContext(profile = "openclaw-web"): CliContext {
  return {
    apiToken: "secret-token",
    apiBaseUrl: "https://us.posthog.com",
    projectId: "12345",
    pretty: false,
    profile: {
      profile,
      profileRoot: "/profiles",
      profileDir: `/profiles/${profile}`,
      profileEnvPath: `/profiles/${profile}/.env`,
      profileEnvFound: true,
      invocationRoot: process.cwd(),
      invocationEnvPaths: [],
    },
  };
}

function createRequest(overrides: Partial<ProviderQueryRequest> = {}) {
  return {
    schema_version: "provider_query_request.v1",
    provider: "posthog",
    operation: "query.dataset.results",
    profile: "openclaw-web",
    input: {
      query: "SELECT event, count() FROM events GROUP BY event",
      limit: 20,
    },
    metadata: {
      purpose: "activation-time-to-action",
    },
    ...overrides,
  } satisfies ProviderQueryRequest;
}

function createClient(input: {
  calls?: QueryRunRequest[];
  result?: unknown;
  error?: unknown;
}): PostHogClient {
  return {
    async checkReadiness() {
      return {
        provider: "posthog",
        ready: true,
        host: "https://us.posthog.com",
        projectId: "12345",
        hasApiToken: true,
      };
    },
    async runHogql(request) {
      input.calls?.push(request);
      if (input.error) throw input.error;
      return input.result ?? [["trial_chat.message_sent", 10]];
    },
    async listEventDefinitions() {
      return [];
    },
    async listPropertyDefinitions() {
      return [];
    },
    async listFeatureFlags() {
      return [];
    },
    async listInsights() {
      return [];
    },
    async listDashboards() {
      return [];
    },
  };
}

async function withTempDir<T>(runner: (dir: string) => Promise<T>) {
  const dir = await mkdtemp(join(tmpdir(), "posthog-query-artifact-"));
  try {
    return await runner(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function writeRequest(dir: string, request: unknown) {
  const path = resolve(dir, "request.json");
  await writeFile(path, `${JSON.stringify(request, null, 2)}\n`, "utf8");
  return path;
}

async function readJson(path: string) {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

describe("posthog query action run", () => {
  test("场景 1.1：合法 request 生成完整 artifact 目录", async () => {
    await withTempDir(async (dir) => {
      const calls: QueryRunRequest[] = [];
      const requestPath = await writeRequest(dir, createRequest());
      const outDir = resolve(dir, "out");

      const result = await runPostHogQueryArtifact(
        { request: requestPath, out: outDir },
        {
          context: createContext(),
          client: createClient({ calls }),
          now: new Date("2026-04-30T00:00:00.000Z"),
          packageVersion: "0.1.2-test",
        }
      );

      expect(result.ok).toBe(true);
      await expect(readdir(outDir)).resolves.toEqual(
        expect.arrayContaining([
          "request.json",
          "command.json",
          "stdout.txt",
          "stderr.txt",
          "raw-result.json",
          "result.json",
          "manifest.json",
        ])
      );
      expect(calls).toEqual([
        {
          query: "SELECT event, count() FROM events GROUP BY event LIMIT 20",
          limit: 20,
          noLimitGuard: true,
        },
      ]);

      const manifest = await readJson(resolve(outDir, "manifest.json"));
      expect(manifest).toMatchObject({
        provider: "posthog",
        operation: "query.dataset.results",
        status: "success",
        cli: { package: "@deniffer/posthog-cli", version: "0.1.2-test" },
        profile: { name: "openclaw-web", profile_env_found: true },
      });
      expect(JSON.stringify(manifest)).toContain("request_hash");
      expect(JSON.stringify(manifest)).toContain("query_hash");
      expect(JSON.stringify(manifest)).toContain("result_hash");

      const stdout = await readJson(resolve(outDir, "stdout.txt"));
      expect(stdout).toMatchObject({
        ok: true,
        data: { rowCount: 1, rows: [["trial_chat.message_sent", 10]] },
      });
    });
  });

  test("场景 1.2：request profile 与 active profile 不一致时停止执行", async () => {
    await withTempDir(async (dir) => {
      const calls: QueryRunRequest[] = [];
      const requestPath = await writeRequest(dir, createRequest());
      const outDir = resolve(dir, "out");

      const result = await runPostHogQueryArtifact(
        { request: requestPath, out: outDir },
        {
          context: createContext("another-profile"),
          client: createClient({ calls }),
          packageVersion: "0.1.2-test",
        }
      );

      expect(result.ok).toBe(false);
      expect(calls).toEqual([]);
      const manifest = await readJson(resolve(outDir, "manifest.json"));
      expect(manifest).toMatchObject({
        status: "failed",
        error: { code: "invalid_input" },
      });
    });
  });

  test("场景 1.3：provider 失败时仍保留失败 artifact", async () => {
    await withTempDir(async (dir) => {
      const requestPath = await writeRequest(dir, createRequest());
      const outDir = resolve(dir, "out");

      const result = await runPostHogQueryArtifact(
        { request: requestPath, out: outDir },
        {
          context: createContext(),
          client: createClient({ error: new Error("provider unavailable") }),
          packageVersion: "0.1.2-test",
        }
      );

      expect(result.ok).toBe(false);
      const stderr = await readJson(resolve(outDir, "stderr.txt"));
      expect(stderr).toMatchObject({
        ok: false,
        error: { code: "backend_failure", message: "provider unavailable" },
      });
      const manifest = await readJson(resolve(outDir, "manifest.json"));
      expect(manifest).toMatchObject({
        status: "failed",
        error: { code: "backend_failure" },
      });
      await expect(readJson(resolve(outDir, "result.json"))).resolves.toMatchObject({
        ok: false,
      });
    });
  });

  test("malformed request JSON is an input error and does not call PostHog", async () => {
    await withTempDir(async (dir) => {
      const calls: QueryRunRequest[] = [];
      const requestPath = resolve(dir, "request.json");
      await writeFile(requestPath, "{ not-json", "utf8");
      const outDir = resolve(dir, "out");

      const result = await runPostHogQueryArtifact(
        { request: requestPath, out: outDir },
        {
          context: createContext(),
          client: createClient({ calls }),
          packageVersion: "0.1.2-test",
        }
      );

      expect(result.ok).toBe(false);
      expect(calls).toEqual([]);
      const stderr = await readJson(resolve(outDir, "stderr.txt"));
      expect(stderr).toMatchObject({
        ok: false,
        error: { code: "invalid_input" },
      });
      const manifest = await readJson(resolve(outDir, "manifest.json"));
      expect(manifest).toMatchObject({
        status: "failed",
        error: { code: "invalid_input" },
      });
      await expect(readFile(resolve(outDir, "request.json"), "utf8")).resolves.toBe(
        "{ not-json\n"
      );
    });
  });

  test("场景 2.1：request 不接受 Growth OS 业务字段", async () => {
    await withTempDir(async (dir) => {
      const calls: QueryRunRequest[] = [];
      const requestPath = await writeRequest(
        dir,
        createRequest({
          metadata: {
            purpose: "activation",
            decision_id: "decision_123",
          },
        } as Partial<ProviderQueryRequest>)
      );
      const outDir = resolve(dir, "out");

      const result = await runPostHogQueryArtifact(
        { request: requestPath, out: outDir },
        {
          context: createContext(),
          client: createClient({ calls }),
          packageVersion: "0.1.2-test",
        }
      );

      expect(result.ok).toBe(false);
      expect(calls).toEqual([]);
      const manifest = await readJson(resolve(outDir, "manifest.json"));
      expect(manifest).toMatchObject({
        status: "failed",
        error: {
          code: "invalid_input",
          message:
            "Provider query request cannot include Growth OS business field: decision_id.",
        },
      });
    });
  });

  test("场景 2.2：generic metadata 不影响 provider query hash", async () => {
    await withTempDir(async (dir) => {
      const firstRequestPath = await writeRequest(
        dir,
        createRequest({ metadata: { purpose: "first" } })
      );
      const secondRequestPath = resolve(dir, "request-2.json");
      await writeFile(
        secondRequestPath,
        `${JSON.stringify(createRequest({ metadata: { purpose: "second" } }), null, 2)}\n`,
        "utf8"
      );

      const first = await runPostHogQueryArtifact(
        { request: firstRequestPath, out: resolve(dir, "out-1") },
        {
          context: createContext(),
          client: createClient({}),
          packageVersion: "0.1.2-test",
        }
      );
      const second = await runPostHogQueryArtifact(
        { request: secondRequestPath, out: resolve(dir, "out-2") },
        {
          context: createContext(),
          client: createClient({}),
          packageVersion: "0.1.2-test",
        }
      );

      expect(first.data.hashes.query_hash).toBe(second.data.hashes.query_hash);
      expect(first.data.hashes.request_hash).not.toBe(
        second.data.hashes.request_hash
      );
    });
  });

  test("场景 2.3：artifact 不生成业务 insight 或 report", async () => {
    await withTempDir(async (dir) => {
      const requestPath = await writeRequest(dir, createRequest());
      const outDir = resolve(dir, "out");

      await runPostHogQueryArtifact(
        { request: requestPath, out: outDir },
        {
          context: createContext(),
          client: createClient({}),
          packageVersion: "0.1.2-test",
        }
      );

      const files = await readdir(outDir);
      expect(files).not.toEqual(
        expect.arrayContaining([
          "finding.json",
          "insight.json",
          "recommendation.md",
          "report.md",
          "decision.json",
        ])
      );
      const serialized = JSON.stringify(await readJson(resolve(outDir, "result.json")));
      expect(serialized).not.toContain("recommended_action");
      expect(serialized).not.toContain("decision_rule");
    });
  });

  test("场景 3.1：manifest 提供稳定 artifact refs", async () => {
    await withTempDir(async (dir) => {
      const requestPath = await writeRequest(dir, createRequest());
      const outDir = resolve(dir, "out");

      await runPostHogQueryArtifact(
        { request: requestPath, out: outDir },
        {
          context: createContext(),
          client: createClient({}),
          packageVersion: "0.1.2-test",
        }
      );

      const manifest = await readJson(resolve(outDir, "manifest.json"));
      expect(manifest).toMatchObject({
        artifacts: {
          request: "request.json",
          command: "command.json",
          stdout: "stdout.txt",
          stderr: "stderr.txt",
          rawResult: "raw-result.json",
          result: "result.json",
          manifest: "manifest.json",
        },
      });
    });
  });

  test("场景 3.2：CLI 不写 Growth OS ledger", async () => {
    await withTempDir(async (dir) => {
      const requestPath = await writeRequest(dir, createRequest());
      const outDir = resolve(dir, "out");

      await runPostHogQueryArtifact(
        { request: requestPath, out: outDir },
        {
          context: createContext(),
          client: createClient({}),
          packageVersion: "0.1.2-test",
        }
      );

      const files = await readdir(outDir);
      expect(files).not.toEqual(
        expect.arrayContaining([
          "route-manifest.json",
          "analysis-output.json",
          "decision-context.json",
          "clickhouse-projection.jsonl",
          "inbox-item.json",
        ])
      );
    });
  });
});
