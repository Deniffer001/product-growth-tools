declare module "argc" {
  export type CommandSchema = Record<string, unknown>;

  export type CliOptions = {
    name?: string;
    version?: string;
    description?: string;
    globals?: unknown;
    schemaMaxLines?: number;
    context?: unknown;
  };

  export type ParsedArgv = {
    flags: Record<string, string | boolean | number | undefined>;
    positionals: string[];
  };

  export type SchemaSelection = {
    schema: CommandSchema;
  };

  export const c: {
    meta(metadata: Record<string, unknown>): {
      input(inputSchema: unknown): unknown;
    };
  };

  export function group(
    metadata: Record<string, unknown>,
    schema: CommandSchema
  ): unknown;

  export function parseArgv(argv: string[]): ParsedArgv;

  export function selectSchema(
    schema: CommandSchema,
    selector: string,
    options?: { depth?: number }
  ): SchemaSelection;

  export function generateSchema(schema: unknown, options?: CliOptions): string;

  export function generateSchemaOutline(
    schema: unknown,
    depth?: number
  ): string[];

  export function cli(
    schema: CommandSchema,
    options?: CliOptions
  ): {
    run(config: { handlers: Record<string, unknown> }): Promise<void>;
  };
}
