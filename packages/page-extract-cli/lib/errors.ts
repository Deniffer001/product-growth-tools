/**
 * @input machine-classified page-extract runtime failures
 * @output stable agent-facing error objects (built on @deniffer/cli-kit)
 * @pos page-extract error contract = cli-kit core + a page-extract-specific mapper
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
  | "network_error"
  | "parse_error"
  | "backend_failure";

// The page-extract-specific divergence, plugged into cli-kit's normalizer seam.
export const pageExtractErrorMapper: CliErrorMapper = (error) => {
  if (error instanceof TypeError) {
    return cliError({
      code: "network_error",
      message: error.message,
      hint: "Check network reachability and retry the request.",
    });
  }

  // Defer Error-without-special-case and non-Error to cli-kit's backend_failure fallback.
  return null;
};

export function normalizeCliError(error: unknown) {
  return normalizeWithMappers(error, [pageExtractErrorMapper]);
}
