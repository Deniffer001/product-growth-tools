/**
 * @input raw CLI strings and scalar provider parameters
 * @output validated and normalized inputs for Bing Webmaster provider calls
 * @pos shared validation layer for Bing Webmaster CLI handlers and request builders
 */

import { cliError } from "./errors";

function parseHttpUrl(value: string, label: string) {
  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }

    return value;
  } catch {
    throw cliError({
      code: "invalid_input",
      message: `Invalid ${label}: ${value}`,
      hint: `${label} must be an absolute http(s) URL.`,
    });
  }
}

function parseInteger(
  value: number,
  label: string,
  options: { min: number; max?: number }
) {
  if (!Number.isInteger(value)) {
    throw cliError({
      code: "invalid_input",
      message: `Invalid ${label}: ${value}`,
      hint: `${label} must be an integer.`,
    });
  }

  if (
    value < options.min ||
    (options.max !== undefined && value > options.max)
  ) {
    const range =
      options.max === undefined
        ? `>= ${options.min}`
        : `between ${options.min} and ${options.max}`;

    throw cliError({
      code: "invalid_input",
      message: `Invalid ${label}: ${value}`,
      hint: `${label} must be ${range}.`,
    });
  }

  return value;
}

export function validateApiKey(apiKey?: string) {
  if (!apiKey) {
    throw cliError({
      code: "invalid_input",
      message: "Missing Bing Webmaster API key.",
      hint: "Pass --api-key <key> or set BING_WEBMASTER_API_KEY.",
    });
  }

  return apiKey;
}

export function validateSiteUrl(siteUrl?: string) {
  if (!siteUrl) {
    throw cliError({
      code: "invalid_input",
      message: "Missing Bing Webmaster site URL.",
      hint: "Pass --site-url <url> or set BING_WEBMASTER_SITE_URL.",
    });
  }

  return parseHttpUrl(siteUrl, "siteUrl");
}

export function validateAbsoluteUrl(value: string, label: string) {
  return parseHttpUrl(value, label);
}

export function validateBingUrlTarget(value: string, label: string) {
  if (value.startsWith("domain:")) {
    const domain = value.slice("domain:".length);
    if (!domain || /\s/.test(domain) || domain.includes("/")) {
      throw cliError({
        code: "invalid_input",
        message: `Invalid ${label}: ${value}`,
        hint: `${label} domain targets must look like domain:example.com.`,
      });
    }
    return value;
  }

  return parseHttpUrl(value, label);
}

export function validateRequiredText(value: string | undefined, label: string) {
  if (!value || value.trim().length === 0) {
    throw cliError({
      code: "invalid_input",
      message: `Missing ${label}.`,
      hint: `Pass --${label.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)} <value>.`,
    });
  }

  return value;
}

export function validatePage(page?: number) {
  return parseInteger(page ?? 0, "page", { min: 0, max: 32767 });
}
