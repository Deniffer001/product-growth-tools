/**
 * @input machine-classified PostHog provider failures
 * @output stable agent-facing error objects (built on @deniffer/cli-kit)
 * @pos PostHog error contract = cli-kit core + a PostHog-specific status mapper
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
  | "auth_error"
  | "quota_error"
  | "network_error"
  | "provider_error"
  | "parse_error"
  | "backend_failure";

function readStatus(error: Error) {
  const status = Reflect.get(error, "status");
  return typeof status === "number" ? status : null;
}

// The PostHog-specific divergence, plugged into cli-kit's normalizer seam.
export const posthogErrorMapper: CliErrorMapper = (error) => {
  if (error instanceof TypeError) {
    return cliError({
      code: "network_error",
      message: error.message,
      hint: "Check network reachability and retry the PostHog request.",
    });
  }

  if (!(error instanceof Error)) {
    return null;
  }

  const status = readStatus(error);
  if (status === 401 || status === 403) {
    return cliError({
      code: "auth_error",
      message: error.message,
      hint: "Check the PostHog personal API key, host, project ID, and scopes.",
    });
  }
  if (status === 402 || status === 429) {
    return cliError({
      code: "quota_error",
      message: error.message,
      hint: "Check PostHog plan access, rate limits, and retry policy.",
    });
  }
  if (status !== null) {
    return cliError({
      code: "provider_error",
      message: error.message,
      hint:
        status >= 500
          ? "PostHog returned a server error. Retry later."
          : "PostHog rejected the request. Check input fields.",
    });
  }

  // Defer Error-without-status and non-Error to cli-kit's backend_failure fallback.
  return null;
};

export function normalizeCliError(error: unknown) {
  return normalizeWithMappers(error, [posthogErrorMapper]);
}
