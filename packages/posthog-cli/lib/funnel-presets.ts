/**
 * @input active product-growth profile and posthog.funnels.json
 * @output validated funnel presets for profile-aware PostHog commands
 * @pos non-secret project knowledge loader shared by funnel and audit commands
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { CliContext } from "../context";
import { cliError } from "./errors";

export type FunnelPreset = {
  name: string;
  description?: string;
  events: string[];
  requiresReconciliation?: boolean;
};

export type FunnelPresetFile = {
  version: 1;
  funnels: Record<string, FunnelPreset>;
};

export type FunnelPresetValidation = {
  ok: boolean;
  path: string | null;
  profile: string | null;
  version: number | null;
  errors: string[];
  warnings: string[];
  funnels: Array<{
    name: string;
    description: string | null;
    eventCount: number;
    requiresReconciliation: boolean;
  }>;
};

export function getFunnelPresetPath(context: CliContext) {
  return context.profile.profileDir
    ? resolve(context.profile.profileDir, "posthog.funnels.json")
    : null;
}

export function resolveFunnelEvents(input: {
  events?: string;
  preset?: string;
  context: CliContext;
  parseEvents: (events: string) => string[];
}) {
  if (input.events && input.preset) {
    throw cliError({
      code: "invalid_input",
      message: "Use either --events or --preset, not both.",
    });
  }

  if (input.events) {
    return input.parseEvents(input.events);
  }

  if (input.preset) {
    return readFunnelPreset(input.preset, input.context).events;
  }

  throw cliError({
    code: "invalid_input",
    message: "Missing funnel events.",
    hint: "Pass --events event.one,event.two or --preset <name>.",
  });
}

export function resolveFunnelSelection(input: {
  events?: string;
  preset?: string;
  context: CliContext;
  parseEvents: (events: string) => string[];
}) {
  if (input.events && input.preset) {
    throw cliError({
      code: "invalid_input",
      message: "Use either --events or --preset, not both.",
    });
  }

  if (input.events) {
    return {
      source: "events" as const,
      preset: null,
      events: input.parseEvents(input.events),
      requiresReconciliation: false,
    };
  }

  if (input.preset) {
    const preset = readFunnelPreset(input.preset, input.context);
    return {
      source: "preset" as const,
      preset: input.preset,
      events: preset.events,
      requiresReconciliation: preset.requiresReconciliation ?? false,
    };
  }

  throw cliError({
    code: "invalid_input",
    message: "Missing funnel events.",
    hint: "Pass --events event.one,event.two or --preset <name>.",
  });
}

export function readFunnelPreset(name: string, context: CliContext) {
  const path = getRequiredPresetPath(context);
  const validation = validateFunnelPresetFile(context);
  if (!validation.ok) {
    throw cliError({
      code: "invalid_input",
      message: "Invalid PostHog funnel preset file.",
      hint: validation.errors.join("; "),
    });
  }

  const file = readPresetFile(path);
  const preset = file.funnels[name];
  if (!preset) {
    throw cliError({
      code: "invalid_input",
      message: `Unknown PostHog funnel preset: ${name}.`,
      hint: `Check ${path}.`,
    });
  }

  return preset;
}

export function validateFunnelPresetFile(context: CliContext): FunnelPresetValidation {
  const path = getFunnelPresetPath(context);
  const profile = context.profile.profile ?? null;
  const errors: string[] = [];
  const warnings: string[] = [];
  const funnels: FunnelPresetValidation["funnels"] = [];

  if (!path) {
    return {
      ok: false,
      path,
      profile,
      version: null,
      errors: ["No active product-growth profile."],
      warnings,
      funnels,
    };
  }

  if (!existsSync(path)) {
    return {
      ok: false,
      path,
      profile,
      version: null,
      errors: [`Missing ${path}.`],
      warnings,
      funnels,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch (error) {
    return {
      ok: false,
      path,
      profile,
      version: null,
      errors: [`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`],
      warnings,
      funnels,
    };
  }

  if (!parsed || typeof parsed !== "object") {
    errors.push("Preset file must be a JSON object.");
  }

  const version = readNumber(parsed, "version");
  if (version !== 1) {
    errors.push("Preset file must set version: 1.");
  }

  const rawFunnels = parsed && typeof parsed === "object" ? Reflect.get(parsed, "funnels") : null;
  if (!rawFunnels || typeof rawFunnels !== "object" || Array.isArray(rawFunnels)) {
    errors.push("Preset file must contain a funnels object.");
  } else {
    for (const [name, rawPreset] of Object.entries(rawFunnels)) {
      const normalized = normalizePreset(name, rawPreset);
      if (!normalized) {
        errors.push(`Invalid funnel preset: ${name}.`);
        continue;
      }

      if (new Set(normalized.events).size !== normalized.events.length) {
        warnings.push(`Funnel preset has duplicate events: ${name}.`);
      }

      funnels.push({
        name,
        description: normalized.description ?? null,
        eventCount: normalized.events.length,
        requiresReconciliation: normalized.requiresReconciliation ?? false,
      });
    }
  }

  return {
    ok: errors.length === 0,
    path,
    profile,
    version,
    errors,
    warnings,
    funnels,
  };
}

function getRequiredPresetPath(context: CliContext) {
  const path = getFunnelPresetPath(context);
  if (path) {
    return path;
  }

  throw cliError({
    code: "invalid_input",
    message: "No active product-growth profile for funnel preset lookup.",
    hint: "Set PRODUCT_GROWTH_PROFILE or pass --events explicitly.",
  });
}

function readPresetFile(path: string): FunnelPresetFile {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
  const rawFunnels =
    parsed && typeof parsed === "object" ? Reflect.get(parsed, "funnels") : {};
  const funnels: Record<string, FunnelPreset> = {};

  if (rawFunnels && typeof rawFunnels === "object" && !Array.isArray(rawFunnels)) {
    for (const [name, rawPreset] of Object.entries(rawFunnels)) {
      const normalized = normalizePreset(name, rawPreset);
      if (normalized) {
        funnels[name] = normalized;
      }
    }
  }

  return { version: 1, funnels };
}

function normalizePreset(name: string, input: unknown): FunnelPreset | null {
  if (Array.isArray(input)) {
    const events = readStringArray(input);
    return events.length === input.length && events.length > 0
      ? { name, events }
      : null;
  }

  if (!input || typeof input !== "object") {
    return null;
  }

  const events = readStringArray(Reflect.get(input, "events"));
  if (events.length === 0) {
    return null;
  }

  const description = Reflect.get(input, "description");
  const requiresReconciliation = Reflect.get(input, "requiresReconciliation");

  return {
    name,
    events,
    ...(typeof description === "string" ? { description } : {}),
    ...(typeof requiresReconciliation === "boolean"
      ? { requiresReconciliation }
      : {}),
  };
}

function readStringArray(input: unknown) {
  return Array.isArray(input)
    ? input.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
}

function readNumber(input: unknown, key: string) {
  const value = input && typeof input === "object" ? Reflect.get(input, key) : null;
  return typeof value === "number" ? value : null;
}
