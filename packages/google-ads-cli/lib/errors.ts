/**
 * @input machine-classified Google Ads provider failures
 * @output stable agent-facing error objects (built on @deniffer/cli-kit)
 * @pos Google Ads error contract = cli-kit core + a Google Ads-specific status mapper
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
  | "unsupported"
  | "backend_failure"
  | "provider_auth"
  | "provider_rate_limited"
  | "provider_failure";

type ProviderError = {
  message?: string;
  error_code?: Record<string, unknown>;
};

function readProviderErrors(error: Error) {
  const providerErrors = Reflect.get(error, "errors");
  return Array.isArray(providerErrors)
    ? (providerErrors as ProviderError[])
    : [];
}

function hasProviderError(errors: ProviderError[], key: string) {
  return errors.some((item) => Boolean(item.error_code?.[key]));
}

// The Google Ads-specific divergence, plugged into cli-kit's normalizer seam.
export const googleAdsErrorMapper: CliErrorMapper = (error) => {
  if (!(error instanceof Error)) {
    return null;
  }

  const status = Number(Reflect.get(error, "status") ?? 0);
  const providerErrors = readProviderErrors(error);

  if (
    status === 401 ||
    status === 403 ||
    hasProviderError(providerErrors, "authentication_error") ||
    hasProviderError(providerErrors, "authorization_error") ||
    hasProviderError(providerErrors, "header_error")
  ) {
    return cliError({
      code: "provider_auth",
      message: error.message,
      hint: "Verify the service account email has Google Ads access, the developer token is valid, and the MCC login customer is correct.",
    });
  }

  if (
    status === 429 ||
    hasProviderError(providerErrors, "quota_error") ||
    hasProviderError(providerErrors, "resource_count_limit_exceeded_error")
  ) {
    return cliError({
      code: "provider_rate_limited",
      message: error.message,
      hint: "Retry later or reduce request frequency.",
    });
  }

  if (status === 404 || hasProviderError(providerErrors, "customer_error")) {
    return cliError({
      code: "not_found",
      message: error.message,
      hint: "Check the customer ID and confirm the account is accessible.",
    });
  }

  if (status === 400 || hasProviderError(providerErrors, "query_error")) {
    return cliError({
      code: "invalid_input",
      message: error.message,
      hint: "Check the GAQL shape, selected fields, and request filters.",
    });
  }

  if (status > 0 || providerErrors.length > 0) {
    return cliError({
      code: "provider_failure",
      message: error.message,
      hint:
        status >= 500
          ? "Retry later; Google returned a server error."
          : undefined,
    });
  }

  // Defer Error-without-status and non-Error to cli-kit's backend_failure fallback.
  return null;
};

export function normalizeCliError(error: unknown) {
  return normalizeWithMappers(error, [googleAdsErrorMapper]);
}
