/**
 * @input active product-growth profile metadata
 * @output validation report for PostHog profile artifacts
 * @pos profile-level contract check for non-secret project knowledge
 */

import type { CliContext } from "../context";
import { runCliCommand } from "../lib/command-support";
import { validateFunnelPresetFile } from "../lib/funnel-presets";

function renderProfileValidation(data: { ok: boolean; path: string | null }) {
  return [`Valid: ${data.ok}`, `Path: ${data.path ?? "(none)"}`];
}

export async function handleProfileValidate(args: {
  input: Record<string, never>;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const validation = validateFunnelPresetFile(args.context);
    services.output.success(validation, renderProfileValidation);
  });
}
