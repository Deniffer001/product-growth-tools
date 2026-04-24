/**
 * @input raw CLI strings and scalar SERP query parameters
 * @output validated and normalized SERP provider inputs
 * @pos shared validation layer for serp-snapshot handlers
 */

import { existsSync } from "node:fs";
import { cliError } from "./errors";

export type SerpDevice = "desktop" | "mobile";
export type SerpOs = "windows" | "macos" | "android" | "ios";

export function validateQuery(value?: string) {
  const query = value?.trim();
  if (query) {
    return query;
  }

  throw cliError({
    code: "invalid_input",
    message: "Missing query.",
    hint: "Pass --query <search-query>.",
  });
}

export function validateCountry(value?: string) {
  const country = value?.trim() || "US";
  if (/^[A-Z]{2}$/i.test(country)) {
    return country.toUpperCase();
  }

  throw cliError({
    code: "invalid_input",
    message: `Invalid country: ${value}`,
    hint: "Use a two-letter ISO country code, for example US.",
  });
}

export function validateLanguage(value?: string) {
  const language = value?.trim() || "en";
  if (/^[a-z]{2}$/i.test(language)) {
    return language.toLowerCase();
  }

  throw cliError({
    code: "invalid_input",
    message: `Invalid language: ${value}`,
    hint: "Use a two-letter language code, for example en.",
  });
}

export function validateDevice(value?: string): SerpDevice {
  const device = value ?? "desktop";
  if (device === "desktop" || device === "mobile") {
    return device;
  }

  throw cliError({
    code: "invalid_input",
    message: `Invalid device: ${value}`,
    hint: "Use desktop or mobile.",
  });
}

export function validateOs(value?: string): SerpOs {
  const os = value ?? "macos";
  if (os === "windows" || os === "macos" || os === "android" || os === "ios") {
    return os;
  }

  throw cliError({
    code: "invalid_input",
    message: `Invalid os: ${value}`,
    hint: "Use windows, macos, android, or ios.",
  });
}

export function validateDepth(value?: number) {
  const depth = value ?? 20;
  if (Number.isInteger(depth) && depth >= 1 && depth <= 100) {
    return depth;
  }

  throw cliError({
    code: "invalid_input",
    message: `Invalid depth: ${value}`,
    hint: "Use an integer from 1 to 100.",
  });
}

export function validateInputFile(value?: string) {
  const path = value?.trim();
  if (!path) {
    throw cliError({
      code: "invalid_input",
      message: "Missing inputFile.",
      hint: "Pass --input-file <keywords.jsonl>.",
    });
  }

  if (!existsSync(path)) {
    throw cliError({
      code: "invalid_input",
      message: `Input file not found: ${path}`,
      hint: "Pass a readable JSONL file with one query per line.",
    });
  }

  return path;
}
