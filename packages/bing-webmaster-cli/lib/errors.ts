/**
 * @input machine-classified Bing Webmaster provider failures
 * @output stable agent-facing error objects
 * @pos Bing Webmaster error contract = cli-kit core + provider-specific mapper
 */

import {
  CliError,
  type CliErrorMapper,
  cliError,
  normalizeCliError as normalizeWithMappers,
} from "@deniffer/cli-kit/errors";

export { CliError, cliError };

export type CliErrorCode =
  | "invalid_input"
  | "not_found"
  | "provider_auth"
  | "provider_rate_limited"
  | "provider_failure"
  | "network_error"
  | "backend_failure";

export type BingWebmasterProviderErrorDetails = {
  status?: number;
  providerCode?: number;
  providerMessage?: string;
};

export class BingWebmasterProviderError extends Error {
  status?: number;
  providerCode?: number;
  providerMessage?: string;

  constructor(message: string, details: BingWebmasterProviderErrorDetails) {
    super(message);
    this.name = "BingWebmasterProviderError";
    this.status = details.status;
    this.providerCode = details.providerCode;
    this.providerMessage = details.providerMessage;
  }
}

function readStatus(error: Error) {
  const status = Reflect.get(error, "status");
  return typeof status === "number" ? status : null;
}

function readProviderCode(error: Error) {
  const providerCode = Reflect.get(error, "providerCode");
  return typeof providerCode === "number" ? providerCode : null;
}

function readProviderMessage(error: Error) {
  const providerMessage = Reflect.get(error, "providerMessage");
  return typeof providerMessage === "string" ? providerMessage : error.message;
}

export const bingWebmasterErrorMapper: CliErrorMapper = (error) => {
  if (error instanceof TypeError) {
    return cliError({
      code: "network_error",
      message: error.message,
      hint: "Check network reachability and retry the request.",
    });
  }

  if (!(error instanceof Error)) {
    return null;
  }

  const status = readStatus(error);
  const providerCode = readProviderCode(error);
  const message = readProviderMessage(error);

  if (
    status === 401 ||
    status === 403 ||
    providerCode === 3 ||
    /invalidapikey/i.test(message)
  ) {
    return cliError({
      code: "provider_auth",
      message,
      hint: "Check BING_WEBMASTER_API_KEY and confirm the user can access the requested Bing Webmaster site.",
    });
  }

  if (status === 429) {
    return cliError({
      code: "provider_rate_limited",
      message,
      hint: "Retry later or reduce request frequency.",
    });
  }

  if (status === 404) {
    return cliError({
      code: "not_found",
      message,
      hint: "Check the siteUrl, URL, feed URL, or query target.",
    });
  }

  if (status === 400) {
    return cliError({
      code: "invalid_input",
      message,
      hint: "Check request parameters and confirm the site is verified in Bing Webmaster Tools.",
    });
  }

  if (status !== null) {
    return cliError({
      code: "provider_failure",
      message,
      hint:
        status >= 500
          ? "Bing Webmaster returned a server error. Retry later."
          : "Bing Webmaster rejected the request.",
    });
  }

  return null;
};

export function normalizeCliError(error: unknown) {
  return normalizeWithMappers(error, [bingWebmasterErrorMapper]);
}
