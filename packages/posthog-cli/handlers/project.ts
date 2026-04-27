/**
 * @input CLI services plus project metadata inputs
 * @output raw PostHog project metadata datasets
 * @pos project dataset handlers for PostHog provider reads
 */

import type { CliContext } from "../context";
import { runCliCommand } from "../lib/command-support";

type EventDefinitionsInput = {
  q?: string;
};

type PropertyDefinitionsInput = {
  type: "event" | "person";
  eventName?: string;
  includePredefinedProperties?: boolean;
};

export async function handleProjectEventDefinitionsDataset(args: {
  input: EventDefinitionsInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const eventDefinitions = await services
      .getPostHogClient()
      .listEventDefinitions(args.input);
    const rows = Array.isArray(eventDefinitions) ? eventDefinitions : [];

    services.output.success({
      q: args.input.q ?? null,
      count: rows.length,
      eventDefinitions: rows,
    });
  });
}

export async function handleProjectPropertyDefinitionsDataset(args: {
  input: PropertyDefinitionsInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const propertyDefinitions = await services
      .getPostHogClient()
      .listPropertyDefinitions(args.input);
    const rows = Array.isArray(propertyDefinitions) ? propertyDefinitions : [];

    services.output.success({
      type: args.input.type,
      eventName: args.input.eventName ?? null,
      count: rows.length,
      propertyDefinitions: rows,
    });
  });
}
