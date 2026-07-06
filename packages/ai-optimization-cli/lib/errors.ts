/**
 * @input machine-classified AI Optimization provider failures
 * @output stable agent-facing error objects (built on @deniffer/cli-kit)
 * @pos AI Optimization error contract = cli-kit core + provider-specific status mapper
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

export const aiOptimizationErrorMapper: CliErrorMapper = (error) => {
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
  if (status === 401 || status === 403) {
    return cliError({
      code: "auth_error",
      message: error.message,
      hint: "Check DataForSEO credentials.",
    });
  }
  if (status === 402 || status === 429) {
    return cliError({
      code: "quota_error",
      message: error.message,
      hint: "Check DataForSEO credits, rate limits, and retry policy.",
    });
  }
  if (status !== null) {
    return cliError({
      code: "provider_error",
      message: error.message,
      hint:
        status >= 500
          ? "DataForSEO returned a server error. Retry later."
          : "DataForSEO rejected the request. Check input fields.",
    });
  }

  return null;
};

export function normalizeCliError(error: unknown) {
  return normalizeWithMappers(error, [aiOptimizationErrorMapper]);
}
