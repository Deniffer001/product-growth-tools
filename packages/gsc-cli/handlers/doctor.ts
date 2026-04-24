/**
 * @input CLI services and resolved local GSC context
 * @output machine-readable local readiness diagnostics
 * @pos doctor handlers for agent-first GSC CLI startup checks
 */

import { existsSync } from "node:fs";
import type { CliContext } from "../client";
import { runCliCommand } from "../lib/command-support";
import { normalizeCliError } from "../lib/errors";

type ReadinessInput = Record<string, never>;

function credentialState(context: CliContext) {
  if (context.credentialsJson) {
    return {
      configured: true,
      source: "GSC_SERVICE_ACCOUNT_JSON",
      fileExists: null,
    };
  }

  if (context.credentialsFile) {
    return {
      configured: true,
      source: "credentialsFile",
      fileExists: existsSync(context.credentialsFile),
      path: context.credentialsFile,
    };
  }

  return {
    configured: false,
    source: null,
    fileExists: null,
  };
}

export async function handleDoctorReadinessDataset(args: {
  input: ReadinessInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const credentials = credentialState(args.context);
    const checks = {
      credentials,
      defaultSiteUrl: {
        configured: Boolean(args.context.siteUrl),
        value: args.context.siteUrl ?? null,
      },
      provider: {
        reachable: false,
        checked: false,
        error: null as null | { code: string; message: string; hint?: string },
      },
    };

    if (credentials.configured && credentials.fileExists !== false) {
      checks.provider.checked = true;
      try {
        await services.getGscClient().listSites();
        checks.provider.reachable = true;
      } catch (error) {
        const normalized = normalizeCliError(error);
        checks.provider.error = {
          code: normalized.code,
          message: normalized.message,
          ...(normalized.hint ? { hint: normalized.hint } : {}),
        };
      }
    }

    services.output.success({
      ready:
        checks.credentials.configured &&
        checks.credentials.fileExists !== false &&
        checks.provider.reachable,
      checks,
    });
  });
}
