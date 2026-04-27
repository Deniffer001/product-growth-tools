/**
 * @input CLI flags, repo env files, process env vars, Python runtime, and provider payloads
 * @output default env loader plus typed Google Ads client factory
 * @pos Google Ads auth and provider-process boundary for CLI handlers
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getActiveProfileMetadata,
  loadProductGrowthEnv,
  resolveInvocationPath,
  resolveProfilePath,
  type ProductGrowthProfileMetadata,
} from "./lib/product-growth-runtime/profile";
import { config } from "dotenv";
import { CliError, cliError } from "./lib/errors";

export type GoogleAdsRow = Record<string, unknown>;

export type KeywordPlanIdeasProviderInput = {
  customerId: string;
  keywords: string[];
  pageUrl?: string;
  geoTargetIds: string[];
  languageId: string;
  network: string;
  includeAdultKeywords: boolean;
  limit: number;
  loginCustomerId?: string;
  linkedCustomerId?: string;
};

export type KeywordPlanHistoricalMetricsProviderInput = {
  customerId: string;
  keywords: string[];
  geoTargetIds: string[];
  languageId: string;
  network: string;
  includeAverageCpc: boolean;
  loginCustomerId?: string;
  linkedCustomerId?: string;
};

export type GoogleAdsClient = {
  listAccessibleCustomers: () => Promise<string[]>;
  runGaql: (input: {
    customerId: string;
    query: string;
    loginCustomerId?: string;
    linkedCustomerId?: string;
  }) => Promise<GoogleAdsRow[]>;
  generateKeywordIdeas: (
    input: KeywordPlanIdeasProviderInput
  ) => Promise<GoogleAdsRow[]>;
  generateKeywordHistoricalMetrics: (
    input: KeywordPlanHistoricalMetricsProviderInput
  ) => Promise<GoogleAdsRow[]>;
};

export type CliContext = {
  credentialsFile?: string;
  credentialsJson?: string;
  customerId?: string;
  loginCustomerId?: string;
  linkedCustomerId?: string;
  pretty?: boolean;
  profile: ProductGrowthProfileMetadata;
};

type EnvLoader = (input: {
  path: string;
  override?: boolean;
  quiet?: boolean;
}) => unknown;

type ProviderPayload = {
  developerToken: string;
  credentialsFile?: string;
  credentialsJson?: string;
  customerId?: string;
  loginCustomerId?: string;
  linkedCustomerId?: string;
  query?: string;
  keywords?: string[];
  pageUrl?: string;
  geoTargetIds?: string[];
  languageId?: string;
  network?: string;
  includeAdultKeywords?: boolean;
  includeAverageCpc?: boolean;
  limit?: number;
};

type ProviderOutput<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; hint?: string } };

const cliDirectory = dirname(fileURLToPath(import.meta.url));
const providerScriptPath = resolve(
  cliDirectory,
  "provider/google_ads_provider.py"
);
const providerVenvPath = resolve(cliDirectory, ".venv");
const providerRequirementsPath = resolve(cliDirectory, "requirements.txt");
const localPythonCandidates = [
  resolve(providerVenvPath, "bin/python3"),
  resolve(providerVenvPath, "bin/python"),
  resolve(providerVenvPath, "Scripts/python.exe"),
];

export function loadDefaultCliEnv(loadEnv: EnvLoader = config) {
  loadProductGrowthEnv(loadEnv);
}

export function getProviderRuntimeState() {
  const pythonBin = resolvePythonBin();
  return {
    pythonBin,
    pythonBinResolved: pythonBin === "python3" ? true : existsSync(pythonBin),
    providerScriptPath,
    providerRequirementsPath,
    providerVenvPath,
    googleAdsSdkImportable: canImportGoogleAdsSdk(pythonBin),
  };
}

export function shouldLoadDefaultCliEnv(input: {
  flags: Record<string, unknown>;
}) {
  if (input.flags.help === true) {
    return false;
  }
  if (input.flags.schema === true || typeof input.flags.schema === "string") {
    return false;
  }
  return true;
}

export function createCliContext(input: {
  credentialsFile?: string;
  customerId?: string;
  loginCustomerId?: string;
  linkedCustomerId?: string;
  pretty?: boolean;
}): CliContext {
  return {
    credentialsFile: resolveCredentialsFile(input.credentialsFile),
    credentialsJson: resolveCredentialsJson(),
    customerId: resolveEnvValue(input.customerId, ["GOOGLE_ADS_CUSTOMER_ID"]),
    loginCustomerId: resolveEnvValue(input.loginCustomerId, [
      "GOOGLE_ADS_LOGIN_CUSTOMER_ID",
    ]),
    linkedCustomerId: resolveEnvValue(input.linkedCustomerId, [
      "GOOGLE_ADS_LINKED_CUSTOMER_ID",
    ]),
    pretty: input.pretty ?? false,
    profile: getActiveProfileMetadata(),
  };
}

function resolveEnvValue(
  override: string | undefined,
  names: string[]
): string | undefined {
  if (override) {
    return override;
  }

  for (const name of names) {
    const value = process.env[name];
    if (value) {
      return value;
    }
  }
}

function resolveCredentialsFile(override?: string) {
  if (override) {
    return resolveInvocationPath(override);
  }

  const resolved = resolveEnvValue(undefined, [
    "GOOGLE_ADS_JSON_KEY_FILE_PATH",
    "GOOGLE_APPLICATION_CREDENTIALS",
  ]);

  if (!resolved) {
    return resolved;
  }

  return resolveProfilePath(resolved);
}

function resolveCredentialsJson() {
  return process.env.GOOGLE_ADS_SERVICE_ACCOUNT_JSON;
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (value) {
    return value;
  }

  throw cliError({
    code: "invalid_input",
    message: `Missing required environment variable: ${name}`,
    hint: "Set Google Ads credentials in the invocation directory .env.local/.env or pass CLI flags.",
  });
}

function createProviderPayload(
  context: CliContext,
  input?: {
    customerId?: string;
    loginCustomerId?: string;
    linkedCustomerId?: string;
    query?: string;
    keywords?: string[];
    pageUrl?: string;
    geoTargetIds?: string[];
    languageId?: string;
    network?: string;
    includeAdultKeywords?: boolean;
    includeAverageCpc?: boolean;
    limit?: number;
  }
): ProviderPayload {
  const credentialsFile = context.credentialsFile;
  const credentialsJson = context.credentialsJson;

  if (!(credentialsFile || credentialsJson)) {
    throw cliError({
      code: "invalid_input",
      message: "Missing Google Ads service account credentials.",
      hint: "Set GOOGLE_ADS_JSON_KEY_FILE_PATH, GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_ADS_SERVICE_ACCOUNT_JSON, or pass --credentials-file <path>.",
    });
  }

  if (credentialsFile && !existsSync(credentialsFile)) {
    throw cliError({
      code: "invalid_input",
      message: `Credentials file not found: ${credentialsFile}`,
      hint: "Pass --credentials-file <path> or set GOOGLE_ADS_JSON_KEY_FILE_PATH to a readable service account JSON file.",
    });
  }

  return {
    developerToken: requireEnv("GOOGLE_ADS_DEVELOPER_TOKEN"),
    credentialsFile,
    credentialsJson,
    customerId: input?.customerId,
    loginCustomerId: input?.loginCustomerId ?? context.loginCustomerId,
    linkedCustomerId: input?.linkedCustomerId ?? context.linkedCustomerId,
    query: input?.query,
    keywords: input?.keywords,
    pageUrl: input?.pageUrl,
    geoTargetIds: input?.geoTargetIds,
    languageId: input?.languageId,
    network: input?.network,
    includeAdultKeywords: input?.includeAdultKeywords,
    includeAverageCpc: input?.includeAverageCpc,
    limit: input?.limit,
  };
}

function resolvePythonBin() {
  if (process.env.GOOGLE_ADS_PROVIDER_PYTHON_BIN) {
    return process.env.GOOGLE_ADS_PROVIDER_PYTHON_BIN;
  }

  for (const candidate of localPythonCandidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return "python3";
}

function canImportGoogleAdsSdk(pythonBin: string) {
  const result = spawnSync(
    pythonBin,
    ["-c", "import google.ads.googleads"],
    {
      cwd: cliDirectory,
      encoding: "utf8",
      stdio: "pipe",
    }
  );

  return result.status === 0;
}

async function runProvider<T>(
  command:
    | "list-accessible-customers"
    | "run-gaql"
    | "generate-keyword-ideas"
    | "generate-keyword-historical-metrics",
  payload: ProviderPayload
) {
  const result = await new Promise<{
    code: number | null;
    stdout: string;
    stderr: string;
  }>((resolveOutput, rejectOutput) => {
    const child = spawn(resolvePythonBin(), [providerScriptPath, command], {
      cwd: cliDirectory,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk: string) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk: string) => stderrChunks.push(chunk));
    child.on("error", (error) => rejectOutput(error));
    child.on("close", (code) => {
      resolveOutput({
        code,
        stdout: stdoutChunks.join("").trim(),
        stderr: stderrChunks.join("").trim(),
      });
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });

  if (result.code !== 0 && !result.stdout) {
    throw cliError({
      code: "backend_failure",
      message: result.stderr || "Python provider execution failed.",
      hint: "Install Google Ads Python dependencies and set GOOGLE_ADS_PROVIDER_PYTHON_BIN if python3 cannot import them.",
    });
  }

  const stdout = result.stdout;

  if (!stdout) {
    throw cliError({
      code: "backend_failure",
      message: "Python provider returned empty output.",
    });
  }

  let parsed: ProviderOutput<T>;
  try {
    parsed = JSON.parse(stdout) as ProviderOutput<T>;
  } catch {
    throw cliError({
      code: "backend_failure",
      message: "Python provider returned invalid JSON.",
      hint: stdout.slice(0, 200),
    });
  }

  if (!parsed.ok) {
    throw new CliError({
      code: parsed.error.code as CliError["code"],
      message: parsed.error.message,
      hint: parsed.error.hint,
    });
  }

  return parsed.data;
}

export function createGoogleAdsClient(context: CliContext): GoogleAdsClient {
  return {
    async listAccessibleCustomers() {
      const data = await runProvider<{ resourceNames: string[] }>(
        "list-accessible-customers",
        createProviderPayload(context)
      );
      return data.resourceNames;
    },
    async runGaql(input) {
      const data = await runProvider<{ rows: GoogleAdsRow[] }>(
        "run-gaql",
        createProviderPayload(context, input)
      );
      return data.rows;
    },
    async generateKeywordIdeas(input) {
      const data = await runProvider<{ rows: GoogleAdsRow[] }>(
        "generate-keyword-ideas",
        createProviderPayload(context, input)
      );
      return data.rows;
    },
    async generateKeywordHistoricalMetrics(input) {
      const data = await runProvider<{ rows: GoogleAdsRow[] }>(
        "generate-keyword-historical-metrics",
        createProviderPayload(context, input)
      );
      return data.rows;
    },
  };
}
