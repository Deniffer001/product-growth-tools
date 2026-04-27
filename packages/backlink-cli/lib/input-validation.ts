/**
 * @input raw CLI strings and scalar backlink request parameters
 * @output validated and normalized DataForSEO Backlinks API inputs
 * @pos shared validation layer for backlink handlers
 */

import { cliError } from "./errors";

export type BacklinksStatusType = "all" | "live" | "lost";

export function validateDomainTarget(value?: string) {
  const target = value?.trim();
  if (!target) {
    throw cliError({
      code: "invalid_input",
      message: "Missing target.",
      hint: "Pass --target <domain>, for example --target openclawai.io.",
    });
  }

  const withoutProtocol = target.replace(/^https?:\/\//i, "");
  const domain = withoutProtocol.split(/[/?#]/)[0]?.replace(/^www\./i, "");
  if (domain && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
    return domain.toLowerCase();
  }

  throw cliError({
    code: "invalid_input",
    message: `Invalid domain target: ${value}`,
    hint: "Use a domain or subdomain without a path, for example openclawai.io.",
  });
}

export function validatePageTarget(value?: string) {
  const target = value?.trim();
  if (!target) {
    throw cliError({
      code: "invalid_input",
      message: "Missing target.",
      hint: "Pass --target <absolute-url>, for example --target https://openclawai.io/.",
    });
  }

  try {
    const url = new URL(target);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    // fall through to typed CLI error
  }

  throw cliError({
    code: "invalid_input",
    message: `Invalid page target: ${value}`,
    hint: "Use an absolute http(s) URL for page-level backlink reads.",
  });
}

export function validateLimit(value?: number) {
  const limit = value ?? 100;
  if (Number.isInteger(limit) && limit >= 1 && limit <= 1000) {
    return limit;
  }

  throw cliError({
    code: "invalid_input",
    message: `Invalid limit: ${value}`,
    hint: "Use an integer from 1 to 1000.",
  });
}

export function validateOffset(value?: number) {
  const offset = value ?? 0;
  if (Number.isInteger(offset) && offset >= 0) {
    return offset;
  }

  throw cliError({
    code: "invalid_input",
    message: `Invalid offset: ${value}`,
    hint: "Use an integer greater than or equal to 0.",
  });
}

export function validateInternalListLimit(value?: number) {
  const limit = value ?? 10;
  if (Number.isInteger(limit) && limit >= 1 && limit <= 1000) {
    return limit;
  }

  throw cliError({
    code: "invalid_input",
    message: `Invalid internalListLimit: ${value}`,
    hint: "Use an integer from 1 to 1000.",
  });
}

export function validateBacklinksStatusType(value?: string): BacklinksStatusType {
  const status = value ?? "all";
  if (status === "all" || status === "live" || status === "lost") {
    return status;
  }

  throw cliError({
    code: "invalid_input",
    message: `Invalid backlinksStatusType: ${value}`,
    hint: "Use all, live, or lost.",
  });
}

export function validateOrderBy(value?: string) {
  const orderBy = value?.trim();
  if (!orderBy) {
    return undefined;
  }

  const parts = orderBy.split(",").map((part) => part.trim());
  if (
    parts.length === 2 &&
    /^[a-z0-9_.]+$/i.test(parts[0] ?? "") &&
    (parts[1] === "asc" || parts[1] === "desc")
  ) {
    return `${parts[0]},${parts[1]}`;
  }

  throw cliError({
    code: "invalid_input",
    message: `Invalid orderBy: ${value}`,
    hint: "Use a provider order expression like rank,desc or backlinks,desc.",
  });
}
