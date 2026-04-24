/**
 * @input CLI services plus local runtime readiness checks
 * @output structured diagnostics for Google Ads CLI readiness
 * @pos doctor dataset handler for Google Ads CLI
 */

import { access } from "node:fs/promises";
import type { CliContext } from "../client";
import { getProviderRuntimeState } from "../client";
import { runCliCommand } from "../lib/command-support";

type CheckStatus = "ok" | "warn";

type DoctorCheck = {
  key: string;
  status: CheckStatus;
  summary: string;
};

const blockingDoctorKeys = new Set([
  "python_bin",
  "provider_script",
  "developer_token",
  "credentials",
  "default_customer",
]);

function buildStatus(ok: boolean): CheckStatus {
  return ok ? "ok" : "warn";
}

async function canRead(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function resolveCredentialSource(context: CliContext) {
  if (context.credentialsFile) {
    return "file";
  }
  if (context.credentialsJson) {
    return "env-json";
  }
  return "missing";
}

function renderCredentialSummary(context: CliContext, source: string) {
  if (source === "file") {
    return context.credentialsFile ?? "missing";
  }

  if (source === "env-json") {
    return "GOOGLE_ADS_SERVICE_ACCOUNT_JSON";
  }

  return "missing service account credentials";
}

function renderDoctor(data: { ready: boolean; checks: DoctorCheck[] }) {
  return [
    `Ready: ${data.ready ? "yes" : "no"}`,
    ...data.checks.map(
      (check) =>
        `${check.status === "ok" ? "OK" : "WARN"} ${check.key}: ${check.summary}`
    ),
  ];
}

export async function handleDoctorReadinessDataset(args: {
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const runtime = getProviderRuntimeState();
    const checks: DoctorCheck[] = [];
    const credentialSource = resolveCredentialSource(services.context);
    const credentialsReadable =
      credentialSource === "file" && services.context.credentialsFile
        ? await canRead(services.context.credentialsFile)
        : credentialSource !== "missing";

    checks.push({
      key: "python_bin",
      status: buildStatus(runtime.pythonBinResolved),
      summary: runtime.pythonBin,
    });

    checks.push({
      key: "provider_script",
      status: buildStatus(await canRead(runtime.providerScriptPath)),
      summary: runtime.providerScriptPath,
    });

    checks.push({
      key: "developer_token",
      status: buildStatus(Boolean(process.env.GOOGLE_ADS_DEVELOPER_TOKEN)),
      summary: process.env.GOOGLE_ADS_DEVELOPER_TOKEN
        ? "configured"
        : "missing GOOGLE_ADS_DEVELOPER_TOKEN",
    });

    checks.push({
      key: "credentials",
      status: buildStatus(credentialsReadable),
      summary: renderCredentialSummary(services.context, credentialSource),
    });

    checks.push({
      key: "default_customer",
      status: buildStatus(Boolean(services.context.customerId)),
      summary: services.context.customerId ?? "missing GOOGLE_ADS_CUSTOMER_ID",
    });

    checks.push({
      key: "default_login_customer",
      status: buildStatus(Boolean(services.context.loginCustomerId)),
      summary:
        services.context.loginCustomerId ??
        "optional; configure if you access child accounts via MCC",
    });

    const ready = checks.every((check) => {
      if (!blockingDoctorKeys.has(check.key)) {
        return true;
      }

      return check.status === "ok";
    });

    services.output.success(
      {
        ready,
        profile: {
          name: services.context.profile.profile ?? null,
          root: services.context.profile.profileRoot ?? null,
          dir: services.context.profile.profileDir ?? null,
          envPath: services.context.profile.profileEnvPath ?? null,
          envFound: services.context.profile.profileEnvFound,
        },
        checks,
      },
      renderDoctor
    );
  });
}
