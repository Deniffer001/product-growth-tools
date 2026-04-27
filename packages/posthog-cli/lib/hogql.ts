/**
 * @input small typed query-building primitives
 * @output escaped HogQL fragments for CLI-generated PostHog reads
 * @pos shared guardrail for generated HogQL, keeping handlers deterministic
 */

import { cliError } from "./errors";

export function quoteHogqlString(value: string) {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

export function parseCsvList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function eventInList(events: string[]) {
  if (events.length === 0) {
    throw cliError({
      code: "invalid_input",
      message: "At least one event is required.",
      hint: "Pass a comma-separated --events list, for example auth.signup,purchase.completed.",
    });
  }

  return events.map(quoteHogqlString).join(",");
}
