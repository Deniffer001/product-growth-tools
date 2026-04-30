/**
 * @input request file, output directory, active product-growth profile, and PostHog provider client
 * @output reproducible PostHog query artifact directory with manifest and hashes
 * @pos artifact-producing action boundary for Growth OS ledger attachment
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import type { CliContext } from "../context";
import { runCliCommand } from "../lib/command-support";
import { cliError, normalizeCliError } from "../lib/errors";
import { resolveInvocationPath } from "../lib/product-growth-runtime/profile";
import type { PostHogClient, QueryRunRequest } from "../provider";
import { withLimitGuard } from "../provider";
import { POSTHOG_CLI_VERSION } from "../constants";

const REQUEST_SCHEMA_VERSION = "provider_query_request.v1";
const MANIFEST_SCHEMA_VERSION = "provider_query_manifest.v1";
const COMMAND_SCHEMA_VERSION = "provider_command.v1";
const PROVIDER = "posthog";
const OPERATION = "query.dataset.results";
const ARTIFACTS = {
  request: "request.json",
  command: "command.json",
  stdout: "stdout.txt",
  stderr: "stderr.txt",
  rawResult: "raw-result.json",
  result: "result.json",
  manifest: "manifest.json",
} as const;
const FORBIDDEN_BUSINESS_FIELDS = new Set([
  "route_id",
  "routeId",
  "run_id",
  "runId",
  "decision_id",
  "decisionId",
  "finding_id",
  "findingId",
  "insight_summary",
  "insightSummary",
  "recommended_action",
  "recommendedAction",
  "decision_rule",
  "decisionRule",
]);

export type QueryActionRunInput = {
  request: string;
  out: string;
};

export type ProviderQueryRequest = {
  schema_version: typeof REQUEST_SCHEMA_VERSION;
  provider: typeof PROVIDER;
  operation: typeof OPERATION;
  profile?: string;
  input: QueryRunRequest;
  metadata?: Record<string, unknown>;
};

export type QueryArtifactRunSummary = {
  provider: typeof PROVIDER;
  operation: typeof OPERATION;
  status: "success" | "failed";
  output_dir: string;
  manifest: string;
  hashes: {
    request_hash: string;
    query_hash?: string;
    result_hash: string;
  };
};

type RunResult =
  | { ok: true; data: QueryArtifactRunSummary }
  | { ok: false; error: unknown; data: QueryArtifactRunSummary };

type Manifest = {
  schema_version: typeof MANIFEST_SCHEMA_VERSION;
  provider: typeof PROVIDER;
  operation: typeof OPERATION;
  profile: {
    name: string | null;
    profile_root?: string;
    profile_dir?: string;
    profile_env_found: boolean;
  };
  cli: {
    package: "@deniffer/posthog-cli";
    version: string;
  };
  request_file: string;
  command_file: string;
  executed_at: string;
  completed_at: string;
  duration_ms: number;
  status: "success" | "failed";
  exit_code: number;
  hashes: {
    request_hash: string;
    query_hash?: string;
    result_hash: string;
  };
  artifacts: typeof ARTIFACTS;
  error?: {
    code: string;
    message: string;
    hint?: string;
  };
};

function renderRun(data: QueryArtifactRunSummary) {
  return [
    `Status: ${data.status}`,
    `Output: ${data.output_dir}`,
    `Manifest: ${data.manifest}`,
  ];
}

export async function handleQueryActionRun(args: {
  input: QueryActionRunInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const result = await runPostHogQueryArtifact(args.input, {
      context: args.context,
      client: services.getPostHogClient(),
      now: new Date(),
    });

    if (result.ok) {
      services.output.success(result.data, renderRun);
      return;
    }

    services.output.error(result.error);
    process.exitCode = 1;
  });
}

export async function runPostHogQueryArtifact(
  input: QueryActionRunInput,
  options: {
    context: CliContext;
    client: PostHogClient;
    now?: Date;
    packageVersion?: string;
  }
): Promise<RunResult> {
  const started = options.now ?? new Date();
  const requestPath = resolveInvocationPath(input.request);
  const outDir = resolveInvocationPath(input.out);
  await mkdir(outDir, { recursive: true });

  let parsedRequest: unknown;
  let rawRequestText: string | undefined;
  let requestHash = "";
  let queryHash: string | undefined;
  let resultHash = "";
  let command = buildNotExecutedCommand(input, options.context);

  try {
    rawRequestText = await readFile(requestPath, "utf8");
    parsedRequest = parseRequestJson(rawRequestText, requestPath);
    const request = validateProviderQueryRequest(parsedRequest, options.context);
    const requestText = stableJsonPretty(request);
    await writeText(outDir, ARTIFACTS.request, requestText);
    requestHash = hashText(requestText);

    const query = withLimitGuard(request.input);
    const executedInput: QueryRunRequest = {
      ...request.input,
      query,
      noLimitGuard: true,
    };
    queryHash = hashObject({
      provider: request.provider,
      operation: request.operation,
      profile: options.context.profile.profile ?? null,
      input: executedInput,
    });
    command = buildExecutedCommand({
      requestPath,
      outDir,
      request,
      executedInput,
      context: options.context,
    });
    await writeJson(outDir, ARTIFACTS.command, command);

    const rawResult = await options.client.runHogql(executedInput);
    const rows = Array.isArray(rawResult) ? rawResult : [];
    const resultEnvelope = {
      ok: true,
      data: {
        rowCount: rows.length,
        rows,
        ...(request.input.raw ? { query, raw: rawResult } : {}),
      },
    };
    await writeJson(outDir, ARTIFACTS.rawResult, rawResult);
    const resultText = stableJsonPretty(resultEnvelope);
    await writeText(outDir, ARTIFACTS.result, resultText);
    resultHash = hashText(resultText);
    await writeText(outDir, ARTIFACTS.stdout, `${JSON.stringify(resultEnvelope, null, 2)}\n`);
    await writeText(outDir, ARTIFACTS.stderr, "");

    const manifest = buildManifest({
      context: options.context,
      packageVersion: options.packageVersion,
      requestPath,
      started,
      status: "success",
      exitCode: 0,
      hashes: {
        request_hash: requestHash,
        query_hash: queryHash,
        result_hash: resultHash,
      },
    });
    await writeJson(outDir, ARTIFACTS.manifest, manifest);

    return {
      ok: true,
      data: buildSummary(outDir, manifest),
    };
  } catch (error) {
    const normalized = normalizeCliError(error);

    if (!requestHash) {
      const requestText =
        parsedRequest === undefined
          ? (rawRequestText ?? await readFallbackRequestText(requestPath))
          : stableJsonPretty(parsedRequest);
      await writeText(outDir, ARTIFACTS.request, requestText);
      requestHash = hashText(requestText);
    }
    await writeJson(outDir, ARTIFACTS.command, command);
    await writeJson(outDir, ARTIFACTS.rawResult, null);

    const resultEnvelope = {
      ok: false,
      error: {
        code: normalized.code,
        message: normalized.message,
        ...(normalized.hint ? { hint: normalized.hint } : {}),
      },
    };
    const resultText = stableJsonPretty(resultEnvelope);
    resultHash = hashText(resultText);
    await writeText(outDir, ARTIFACTS.result, resultText);
    await writeText(outDir, ARTIFACTS.stdout, "");
    await writeText(outDir, ARTIFACTS.stderr, `${JSON.stringify(resultEnvelope, null, 2)}\n`);

    const manifest = buildManifest({
      context: options.context,
      packageVersion: options.packageVersion,
      requestPath,
      started,
      status: "failed",
      exitCode: 1,
      hashes: {
        request_hash: requestHash,
        ...(queryHash ? { query_hash: queryHash } : {}),
        result_hash: resultHash,
      },
      error: resultEnvelope.error,
    });
    await writeJson(outDir, ARTIFACTS.manifest, manifest);

    return {
      ok: false,
      error: normalized,
      data: buildSummary(outDir, manifest),
    };
  }
}

export function validateProviderQueryRequest(
  input: unknown,
  context: CliContext
): ProviderQueryRequest {
  if (!isRecord(input)) {
    throw invalidRequest("Request must be a JSON object.");
  }

  const forbidden = findForbiddenBusinessField(input);
  if (forbidden) {
    throw invalidRequest(
      `Provider query request cannot include Growth OS business field: ${forbidden}.`
    );
  }

  if (input.schema_version !== REQUEST_SCHEMA_VERSION) {
    throw invalidRequest(
      `schema_version must be ${REQUEST_SCHEMA_VERSION}.`
    );
  }
  if (input.provider !== PROVIDER) {
    throw invalidRequest(`provider must be ${PROVIDER}.`);
  }
  if (input.operation !== OPERATION) {
    throw invalidRequest(`operation must be ${OPERATION}.`);
  }

  const profile =
    typeof input.profile === "string" && input.profile.length > 0
      ? input.profile
      : undefined;
  if (profile && profile !== context.profile.profile) {
    throw invalidRequest(
      `Request profile ${profile} does not match active profile ${context.profile.profile ?? "<none>"}.`
    );
  }

  if (!isRecord(input.input)) {
    throw invalidRequest("input must be a JSON object.");
  }
  const queryInput = input.input as Record<string, unknown>;
  if (typeof queryInput.query !== "string" || queryInput.query.trim().length === 0) {
    throw invalidRequest("input.query must be a non-empty string.");
  }
  if (
    queryInput.limit !== undefined &&
    (!Number.isInteger(queryInput.limit) || Number(queryInput.limit) <= 0)
  ) {
    throw invalidRequest("input.limit must be a positive integer when provided.");
  }
  if (
    queryInput.noLimitGuard !== undefined &&
    typeof queryInput.noLimitGuard !== "boolean"
  ) {
    throw invalidRequest("input.noLimitGuard must be a boolean when provided.");
  }
  if (queryInput.raw !== undefined && typeof queryInput.raw !== "boolean") {
    throw invalidRequest("input.raw must be a boolean when provided.");
  }
  if (input.metadata !== undefined && !isRecord(input.metadata)) {
    throw invalidRequest("metadata must be a JSON object when provided.");
  }

  return {
    schema_version: REQUEST_SCHEMA_VERSION,
    provider: PROVIDER,
    operation: OPERATION,
    ...(profile ? { profile } : {}),
    input: {
      query: queryInput.query,
      ...(queryInput.limit !== undefined ? { limit: queryInput.limit as number } : {}),
      ...(queryInput.noLimitGuard !== undefined
        ? { noLimitGuard: queryInput.noLimitGuard as boolean }
        : {}),
      ...(queryInput.raw !== undefined ? { raw: queryInput.raw as boolean } : {}),
    },
    ...(input.metadata ? { metadata: input.metadata as Record<string, unknown> } : {}),
  };
}

function buildExecutedCommand(input: {
  requestPath: string;
  outDir: string;
  request: ProviderQueryRequest;
  executedInput: QueryRunRequest;
  context: CliContext;
}) {
  return {
    schema_version: COMMAND_SCHEMA_VERSION,
    provider: PROVIDER,
    operation: OPERATION,
    status: "executed",
    executable: "posthog",
    argv: [
      "query",
      "dataset",
      "results",
      "--input",
      JSON.stringify(input.executedInput),
    ],
    request_file: basename(input.requestPath),
    output_dir: input.outDir,
    input: input.executedInput,
    metadata: input.request.metadata ?? {},
    env: redactedEnv(input.context),
  };
}

function buildNotExecutedCommand(input: QueryActionRunInput, context: CliContext) {
  return {
    schema_version: COMMAND_SCHEMA_VERSION,
    provider: PROVIDER,
    operation: OPERATION,
    status: "not_executed",
    executable: "posthog",
    argv: ["query", "dataset", "results"],
    request_file: input.request,
    output_dir: input.out,
    env: redactedEnv(context),
  };
}

function redactedEnv(context: CliContext) {
  return {
    PRODUCT_GROWTH_PROFILE: context.profile.profile ?? null,
    POSTHOG_HOST: context.apiBaseUrl,
    POSTHOG_PROJECT_ID: context.projectId ?? null,
    POSTHOG_API_TOKEN: context.apiToken ? "<redacted>" : null,
  };
}

function buildManifest(input: {
  context: CliContext;
  packageVersion?: string;
  requestPath: string;
  started: Date;
  status: "success" | "failed";
  exitCode: number;
  hashes: Manifest["hashes"];
  error?: Manifest["error"];
}): Manifest {
  const completed = new Date();

  return {
    schema_version: MANIFEST_SCHEMA_VERSION,
    provider: PROVIDER,
    operation: OPERATION,
    profile: {
      name: input.context.profile.profile ?? null,
      ...(input.context.profile.profileRoot
        ? { profile_root: input.context.profile.profileRoot }
        : {}),
      ...(input.context.profile.profileDir
        ? { profile_dir: input.context.profile.profileDir }
        : {}),
      profile_env_found: input.context.profile.profileEnvFound,
    },
    cli: {
      package: "@deniffer/posthog-cli",
      version: input.packageVersion ?? readPackageVersion(),
    },
    request_file: resolve(input.requestPath),
    command_file: ARTIFACTS.command,
    executed_at: input.started.toISOString(),
    completed_at: completed.toISOString(),
    duration_ms: Math.max(0, completed.getTime() - input.started.getTime()),
    status: input.status,
    exit_code: input.exitCode,
    hashes: input.hashes,
    artifacts: ARTIFACTS,
    ...(input.error ? { error: input.error } : {}),
  };
}

function buildSummary(outDir: string, manifest: Manifest): QueryArtifactRunSummary {
  return {
    provider: PROVIDER,
    operation: OPERATION,
    status: manifest.status,
    output_dir: outDir,
    manifest: resolve(outDir, ARTIFACTS.manifest),
    hashes: manifest.hashes,
  };
}

function findForbiddenBusinessField(input: unknown): string | null {
  if (Array.isArray(input)) {
    for (const item of input) {
      const found = findForbiddenBusinessField(item);
      if (found) return found;
    }
    return null;
  }

  if (!isRecord(input)) {
    return null;
  }

  for (const [key, value] of Object.entries(input)) {
    if (FORBIDDEN_BUSINESS_FIELDS.has(key)) {
      return key;
    }
    const found = findForbiddenBusinessField(value);
    if (found) return found;
  }
  return null;
}

function invalidRequest(message: string) {
  return cliError({
    code: "invalid_input",
    message,
    hint: "Use provider_query_request.v1 with provider=posthog and operation=query.dataset.results.",
  });
}

function parseRequestJson(value: string, path: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw cliError({
        code: "invalid_input",
        message: `Request file must contain valid JSON: ${path}.`,
        hint: error.message,
      });
    }
    throw error;
  }
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return Boolean(input) && typeof input === "object" && !Array.isArray(input);
}

async function readFallbackRequestText(path: string) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    const normalized = normalizeCliError(error);
    return stableJsonPretty({
      unreadable_request_file: path,
      error: {
        code: normalized.code,
        message: normalized.message,
      },
    });
  }
}

async function writeJson(dir: string, file: string, value: unknown) {
  await writeText(dir, file, stableJsonPretty(value));
}

async function writeText(dir: string, file: string, value: string) {
  await writeFile(resolve(dir, file), value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

function hashObject(value: unknown) {
  return hashText(stableJson(value));
}

function hashText(value: string) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function stableJsonPretty(value: unknown) {
  return `${JSON.stringify(stableNormalize(value), null, 2)}\n`;
}

function stableJson(value: unknown) {
  return JSON.stringify(stableNormalize(value));
}

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableNormalize);
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableNormalize(entry)])
  );
}

function readPackageVersion() {
  return POSTHOG_CLI_VERSION;
}
