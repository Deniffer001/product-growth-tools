/**
 * @input machine-classified CLI error metadata
 * @output stable CliError shape for agent-facing runtime failures (built on @deniffer/cli-kit)
 * @pos GSC error contract = cli-kit core + a Google-specific status mapper
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

function readProviderReason(error: Error) {
  const response = Reflect.get(error, "response") as
    | { data?: { error?: { errors?: Array<{ reason?: string }> } } }
    | undefined;

  return (
    (Reflect.get(error, "reason") as string | undefined) ??
    response?.data?.error?.errors?.[0]?.reason ??
    ""
  );
}

// The GSC-specific divergence, plugged into cli-kit's normalizer seam.
export const gscErrorMapper: CliErrorMapper = (error) => {
  if (!(error instanceof Error)) {
    return null;
  }

  const status = Number(
    Reflect.get(error, "status") ?? Reflect.get(error, "code") ?? 0
  );
  const reason = readProviderReason(error);

  if (!status) {
    // Defer Error-without-status to cli-kit's backend_failure fallback.
    return null;
  }

  if (
    status === 401 ||
    status === 403 ||
    reason === "insufficientPermissions" ||
    reason === "accessNotConfigured"
  ) {
    return cliError({
      code: "provider_auth",
      message: error.message,
      hint: "Verify the service account has Search Console access and the Search Console API is enabled.",
    });
  }

  if (
    status === 429 ||
    reason === "rateLimitExceeded" ||
    reason === "userRateLimitExceeded" ||
    reason === "quotaExceeded"
  ) {
    return cliError({
      code: "provider_rate_limited",
      message: error.message,
      hint: "Retry later or reduce request frequency.",
    });
  }

  if (status === 404) {
    return cliError({
      code: "not_found",
      message: error.message,
      hint: "Check the property URL and confirm the account can access it.",
    });
  }

  if (status === 400) {
    return cliError({
      code: "invalid_input",
      message: error.message,
      hint: "Check the request shape, property URL, and filter values.",
    });
  }

  return cliError({
    code: "provider_failure",
    message: error.message,
    hint:
      status >= 500
        ? "Retry later; Google returned a server error."
        : undefined,
  });
};

export function normalizeCliError(error: unknown) {
  return normalizeWithMappers(error, [gscErrorMapper]);
}
