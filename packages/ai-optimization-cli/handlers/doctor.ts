/**
 * @input CLI services and runtime credentials context
 * @output local readiness dataset for DataForSEO AI Optimization calls
 * @pos readiness handler for DataForSEO-backed AI Optimization workflows
 */

import type { CliContext } from "../context";
import { runCliCommand } from "../lib/command-support";

function renderReadiness(data: { provider: string; ready: boolean }) {
  return [`Provider: ${data.provider}`, `Ready: ${data.ready ? "yes" : "no"}`];
}

export async function handleDoctorDatasetReadiness(args: {
  input: Record<string, never>;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const readiness = await services
      .getAiOptimizationClient()
      .checkReadiness();

    services.output.success(
      {
        ...readiness,
        profile: services.context.profile,
      },
      renderReadiness
    );
  });
}
