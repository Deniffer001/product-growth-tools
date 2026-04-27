/**
 * @input CLI services and resolved local PostHog context
 * @output machine-readable local readiness diagnostics
 * @pos doctor handlers for agent-first PostHog CLI startup checks
 */

import type { CliContext } from "../context";
import { runCliCommand } from "../lib/command-support";
import { normalizeCliError } from "../lib/errors";

type ReadinessInput = Record<string, never>;

export async function handleDoctorReadinessDataset(args: {
  input: ReadinessInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const checks = {
      credentials: {
        configured: Boolean(services.context.apiToken),
        source: services.context.apiToken ? "apiToken" : null,
      },
      host: {
        configured: Boolean(services.context.apiBaseUrl),
        value: services.context.apiBaseUrl,
      },
      project: {
        configured: Boolean(services.context.projectId),
        value: services.context.projectId ?? null,
      },
      provider: {
        reachable: false,
        checked: false,
        error: null as null | { code: string; message: string; hint?: string },
      },
    };

    let readiness = null;
    if (checks.credentials.configured) {
      checks.provider.checked = true;
      try {
        readiness = await services.getPostHogClient().checkReadiness();
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
      ready: checks.credentials.configured && checks.provider.reachable,
      profile: {
        name: services.context.profile.profile ?? null,
        root: services.context.profile.profileRoot ?? null,
        dir: services.context.profile.profileDir ?? null,
        envPath: services.context.profile.profileEnvPath ?? null,
        envFound: services.context.profile.profileEnvFound,
      },
      checks,
      readiness,
    });
  });
}
