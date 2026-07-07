/**
 * @input CLI services and resolved local Bing Webmaster context
 * @output machine-readable local readiness diagnostics
 * @pos doctor handlers for agent-first Bing Webmaster CLI startup checks
 */

import type { CliContext } from "../context";
import { runCliCommand } from "../lib/command-support";
import { normalizeCliError } from "../lib/errors";

type ReadinessInput = Record<string, never>;

function apiKeyState(context: CliContext) {
  return {
    configured: Boolean(context.apiKey),
    source: context.apiKey ? "BING_WEBMASTER_API_KEY" : null,
  };
}

export async function handleDoctorDatasetReadiness(args: {
  input: ReadinessInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const apiKey = apiKeyState(args.context);
    const checks = {
      apiKey,
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

    if (apiKey.configured) {
      checks.provider.checked = true;
      try {
        await services.getBingWebmasterClient().getUserSites();
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
      ready: checks.apiKey.configured && checks.provider.reachable,
      profile: {
        name: services.context.profile.profile ?? null,
        root: services.context.profile.profileRoot ?? null,
        dir: services.context.profile.profileDir ?? null,
        envPath: services.context.profile.profileEnvPath ?? null,
        envFound: services.context.profile.profileEnvFound,
      },
      checks,
    });
  });
}
