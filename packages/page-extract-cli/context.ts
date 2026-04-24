/**
 * @input CLI global flags
 * @output typed runtime context for output-mode and provider decisions
 * @pos lightweight runtime context boundary for page-extract CLI
 */

export type CliContext = {
  pretty?: boolean;
  ctxBin?: string;
};

export function createCliContext(input: {
  pretty?: boolean;
  ctxBin?: string;
}): CliContext {
  return {
    pretty: input.pretty ?? false,
    ctxBin: input.ctxBin ?? process.env.CTX_BIN ?? "ctx",
  };
}
