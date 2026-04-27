/**
 * @input runtime context, services factory, and async handler body
 * @output shared command wrapper for stable error serialization
 * @pos command-support layer for backlink handlers
 */

import type { CliContext } from "../context";
import type { CliServices } from "../services";
import { createCliServices } from "../services";

export async function runCliCommand(
  context: CliContext,
  runner: (services: CliServices) => Promise<void>
) {
  const services = createCliServices(context);

  try {
    await runner(services);
  } catch (error) {
    services.output.error(error);
    process.exitCode = 1;
  }
}
