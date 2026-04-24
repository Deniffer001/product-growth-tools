/**
 * @input raw CLI strings and scalar provider parameters
 * @output validated and normalized inputs for Google Ads provider calls
 * @pos shared validation layer for Google Ads CLI handlers and query builders
 */

import { cliError } from "./errors";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CUSTOMER_ID_RE = /^\d{10}$/;
const TRAILING_SEMICOLON_RE = /;$/;
const GOOGLE_ADS_ID_RE = /^\d+$/;

function parseIsoDate(value: string, label: string) {
  if (!ISO_DATE_RE.test(value)) {
    throw cliError({
      code: "invalid_input",
      message: `Invalid ${label}: ${value}`,
      hint: `${label} must use YYYY-MM-DD format.`,
    });
  }

  const date = new Date(`${value}T00:00:00Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw cliError({
      code: "invalid_input",
      message: `Invalid ${label}: ${value}`,
      hint: `${label} must be a real calendar date.`,
    });
  }

  return value;
}

function normalizeCustomerIdValue(value: string) {
  return value.replaceAll("-", "");
}

export function validateCustomerId(value?: string, label = "customerId") {
  if (!value) {
    throw cliError({
      code: "invalid_input",
      message: "Missing Google Ads customer ID.",
      hint: "Pass --customer-id <id> or set GOOGLE_ADS_CUSTOMER_ID.",
    });
  }

  const normalized = normalizeCustomerIdValue(value);
  if (!CUSTOMER_ID_RE.test(normalized)) {
    throw cliError({
      code: "invalid_input",
      message: `Invalid ${label}: ${value}`,
      hint: `${label} must be a 10-digit Google Ads customer ID.`,
    });
  }

  return normalized;
}

export function validateDateRange(startDate: string, endDate: string) {
  const start = parseIsoDate(startDate, "startDate");
  const end = parseIsoDate(endDate, "endDate");

  if (start > end) {
    throw cliError({
      code: "invalid_input",
      message: "startDate cannot be after endDate.",
      hint: "Pass a date range where startDate <= endDate.",
    });
  }

  return { startDate: start, endDate: end };
}

export function validateLimit(value?: number) {
  if (value === undefined) {
    return value;
  }

  if (!Number.isInteger(value) || value < 1 || value > 1000) {
    throw cliError({
      code: "invalid_input",
      message: `Invalid limit: ${value}`,
      hint: "limit must be an integer between 1 and 1000.",
    });
  }

  return value;
}

export function parseCommaSeparatedList(value?: string, label = "value") {
  if (!value) {
    return [] as string[];
  }

  const values = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (values.length === 0) {
    throw cliError({
      code: "invalid_input",
      message: `Invalid ${label}: ${value}`,
      hint: `${label} must contain at least one non-empty value.`,
    });
  }

  return values;
}

export function validateGoogleAdsIds(value?: string, label = "ids") {
  const values = parseCommaSeparatedList(value, label);

  for (const entry of values) {
    if (!GOOGLE_ADS_ID_RE.test(entry)) {
      throw cliError({
        code: "invalid_input",
        message: `Invalid ${label}: ${entry}`,
        hint: `${label} must be a comma-separated list of numeric Google Ads constant IDs.`,
      });
    }
  }

  return values;
}

export function validateKeywordPlanNetwork(value?: string) {
  const network = value ?? "GOOGLE_SEARCH";
  if (!["GOOGLE_SEARCH", "GOOGLE_SEARCH_AND_PARTNERS"].includes(network)) {
    throw cliError({
      code: "invalid_input",
      message: `Invalid network: ${network}`,
      hint: "network must be GOOGLE_SEARCH or GOOGLE_SEARCH_AND_PARTNERS.",
    });
  }

  return network;
}

export function validateLanguageId(value?: string) {
  const languageId = value ?? "1000";
  if (!GOOGLE_ADS_ID_RE.test(languageId)) {
    throw cliError({
      code: "invalid_input",
      message: `Invalid languageId: ${languageId}`,
      hint: "languageId must be a numeric Google Ads language constant ID.",
    });
  }

  return languageId;
}

export function validateAbsoluteUrl(value?: string, label = "url") {
  if (!value) {
    return value;
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

export function validateGaqlQuery(value: string) {
  const query = value.trim().replace(TRAILING_SEMICOLON_RE, "");
  const normalized = query.toUpperCase();

  if (!normalized.startsWith("SELECT ")) {
    throw cliError({
      code: "invalid_input",
      message: "GAQL query must start with SELECT.",
      hint: "Pass a read-only GAQL statement like SELECT campaign.id FROM campaign LIMIT 10.",
    });
  }

  return query;
}
