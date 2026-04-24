/**
 * @input raw CLI strings and scalar extraction parameters
 * @output validated and normalized inputs for page extraction calls
 * @pos shared validation layer for page-extract handlers
 */

import { cliError } from "./errors";

export function validateAbsoluteHttpUrl(value?: string, label = "url") {
  if (!value) {
    throw cliError({
      code: "invalid_input",
      message: `Missing ${label}.`,
      hint: `Pass --${label.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)} <https-url>.`,
    });
  }

  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    // handled below
  }

  throw cliError({
    code: "invalid_input",
    message: `Invalid ${label}: ${value}`,
    hint: `${label} must be an absolute http(s) URL.`,
  });
}

export function validateProvider(value?: string): "ctx" {
  const provider = value ?? "ctx";
  if (provider === "ctx") {
    return provider;
  }

  throw cliError({
    code: "invalid_input",
    message: `Unsupported provider: ${provider}`,
    hint: "The first page-extract provider is ctx. Pass --provider ctx.",
  });
}

export function validateScreenshotOutput(value?: string) {
  if (!value) {
    return value;
  }

  if (value.trim().length === 0) {
    throw cliError({
      code: "invalid_input",
      message: "Invalid screenshotOutput: empty value.",
      hint: "Pass a writable file path for --screenshot-output.",
    });
  }

  return value;
}
