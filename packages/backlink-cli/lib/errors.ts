/**
 * @input machine-classified backlink provider failures
 * @output stable agent-facing error objects
 * @pos shared error contract for backlink handlers and provider calls
 */

export type CliErrorCode =
  | "invalid_input"
  | "auth_error"
  | "quota_error"
  | "network_error"
  | "provider_error"
  | "parse_error"
  | "backend_failure";

export class CliError extends Error {
  code: CliErrorCode;
  hint?: string;

  constructor(input: { code: CliErrorCode; message: string; hint?: string }) {
    super(input.message);
    this.name = "CliError";
    this.code = input.code;
    this.hint = input.hint;
  }
}

export function cliError(input: {
  code: CliErrorCode;
  message: string;
  hint?: string;
}) {
  return new CliError(input);
}

function readStatus(error: Error) {
  const status = Reflect.get(error, "status");
  return typeof status === "number" ? status : null;
}

export function normalizeCliError(error: unknown) {
  if (error instanceof CliError) {
    return error;
  }

  if (error instanceof TypeError) {
    return cliError({
      code: "network_error",
      message: error.message,
      hint: "Check network reachability and retry the request.",
    });
  }

  if (error instanceof Error) {
    const status = readStatus(error);

    if (status === 401 || status === 403) {
      return cliError({
        code: "auth_error",
        message: error.message,
        hint: "Check backlink provider credentials.",
      });
    }

    if (status === 402 || status === 429) {
      return cliError({
        code: "quota_error",
        message: error.message,
        hint: "Check backlink provider credits, subscription, rate limits, and retry policy.",
      });
    }

    if (status !== null) {
      return cliError({
        code: "provider_error",
        message: error.message,
        hint:
          status >= 500
            ? "The backlink provider returned a server error. Retry later."
            : "The backlink provider rejected the request. Check input fields.",
      });
    }

    return cliError({
      code: "backend_failure",
      message: error.message,
    });
  }

  return cliError({
    code: "backend_failure",
    message: "Unknown CLI error",
  });
}
