/**
 * @input machine-classified sitemap-watch runtime failures
 * @output stable agent-facing error objects (built on @deniffer/cli-kit)
 * @pos sitemap error contract = cli-kit core + a sitemap-specific status mapper
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

function readStatus(error: Error) {
  const status = Reflect.get(error, "status");
  return typeof status === "number" ? status : null;
}

// The sitemap-specific divergence, plugged into cli-kit's normalizer seam.
export const sitemapErrorMapper: CliErrorMapper = (error) => {
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
  if (status !== null) {
    return cliError({
      code: "network_error",
      message: error.message,
      hint:
        status >= 500
          ? "The upstream sitemap host returned a server error. Retry later."
          : "The sitemap endpoint could not be reached successfully. Check the URL and retry.",
    });
  }

  // Defer Error-without-status and non-Error to cli-kit's backend_failure fallback.
  return null;
};

export function normalizeCliError(error: unknown) {
  return normalizeWithMappers(error, [sitemapErrorMapper]);
}
