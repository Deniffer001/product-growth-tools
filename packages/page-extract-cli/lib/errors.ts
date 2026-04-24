/**
 * @input machine-classified page-extract runtime failures
 * @output stable agent-facing error objects
 * @pos shared error contract for extraction provider and output
 */

export type CliErrorCode =
  | "invalid_input"
  | "not_found"
  | "network_error"
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
