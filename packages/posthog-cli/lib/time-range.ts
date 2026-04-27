/**
 * @input CLI time window or absolute date range flags
 * @output stable HogQL timestamp predicate plus display label
 * @pos one time-range contract for PostHog dataset reads
 */

import { cliError } from "./errors";

const WINDOW_PATTERN = /^(\d+)([hdw])$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?$/;

export type TimeRangeInput = {
  window?: string;
  from?: string;
  to?: string;
};

export type ResolvedTimeRange = {
  label: string;
  predicate: string;
};

export function resolveTimeRange(input: TimeRangeInput): ResolvedTimeRange {
  if (input.window && (input.from || input.to)) {
    throw cliError({
      code: "invalid_input",
      message: "Use either --window or --from/--to, not both.",
    });
  }

  if (input.from || input.to) {
    if (!input.from || !input.to) {
      throw cliError({
        code: "invalid_input",
        message: "Absolute time ranges require both --from and --to.",
      });
    }

    validateDateLike(input.from, "--from");
    validateDateLike(input.to, "--to");

    return {
      label: `${input.from}..${input.to}`,
      predicate: `timestamp >= toDateTime(${quoteTime(input.from)}) AND timestamp < toDateTime(${quoteTime(input.to)})`,
    };
  }

  const window = input.window ?? "7d";
  return {
    label: window,
    predicate: `timestamp >= now() - ${windowToInterval(window)}`,
  };
}

export function windowToInterval(window: string) {
  const match = WINDOW_PATTERN.exec(window.trim());

  if (!match) {
    throw cliError({
      code: "invalid_input",
      message: "Invalid time window.",
      hint: "Use a compact duration such as 24h, 3d, or 2w.",
    });
  }

  const value = Number(match[1]);
  if (!Number.isInteger(value) || value <= 0 || value > 365) {
    throw cliError({
      code: "invalid_input",
      message: "Invalid time window value.",
      hint: "Use a positive duration no larger than 365 units.",
    });
  }

  const unit = match[2] === "h" ? "HOUR" : match[2] === "d" ? "DAY" : "WEEK";
  return `INTERVAL ${value} ${unit}`;
}

function quoteTime(value: string) {
  return `'${value.replace("T", " ")}'`;
}

function validateDateLike(value: string, flag: string) {
  if (DATE_PATTERN.test(value)) {
    return;
  }

  throw cliError({
    code: "invalid_input",
    message: `Invalid ${flag} value.`,
    hint: "Use YYYY-MM-DD or YYYY-MM-DD HH:mm:ss.",
  });
}
