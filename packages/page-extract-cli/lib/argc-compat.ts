/**
 * @input legacy argv, argc router schema, and global flag names
 * @output normalized argc v7 argv plus extracted global flags
 * @pos compatibility boundary for older agent command shapes
 */

import type { Router } from "argc";

const originalStdoutWrite = process.stdout.write.bind(
  process.stdout
) as typeof process.stdout.write;
const originalConsoleLog = console.log;

export type LegacyArgvResult = {
  flags: Record<string, boolean | string>;
  positionals: string[];
  raw: string[];
  argvForArgc: string[];
};

export function createArgcOptions(input: {
  name: string;
  version: string;
  description?: string;
}) {
  return {
    name: input.name,
    version: input.version,
    ...(input.description ? { description: input.description } : {}),
  };
}

export function withLegacyContext<TInput, TContext>(
  handler: (args: { input: TInput; context: TContext }) => unknown,
  context: TContext
) {
  return async (args: { input: TInput }) => {
    const redirectedStdoutWrite = process.stdout.write;
    const redirectedConsoleLog = console.log;

    process.stdout.write = originalStdoutWrite;
    console.log = originalConsoleLog;

    try {
      return await handler({
        input: args.input,
        context,
      });
    } finally {
      process.stdout.write = redirectedStdoutWrite;
      console.log = redirectedConsoleLog;
    }
  };
}

export function normalizeLegacyArgv(input: {
  argv: string[];
  schema: Router;
  globalFlags: readonly string[];
}): LegacyArgvResult {
  const globalFlags = new Set(input.globalFlags);
  const flags: Record<string, boolean | string> = {};
  const positionals: string[] = [];
  const argvForArgc: string[] = [];
  const commandPath = collectCommandPath(input.argv, input.schema);
  let index = 0;

  if (commandPath.length > 0) {
    argvForArgc.push(commandPath.join("."));
    positionals.push(...commandPath);
    index = commandPath.length;
  }

  while (index < input.argv.length) {
    const token = input.argv[index]!;

    if (token === "--") {
      argvForArgc.push(...input.argv.slice(index));
      break;
    }

    if (!token.startsWith("--")) {
      positionals.push(token);
      argvForArgc.push(token);
      index += 1;
      continue;
    }

    const parsed = parseLongFlag(token);
    const name = toCamelCase(parsed.name);
    const inlineValue = parsed.value;
    const next = input.argv[index + 1];
    const hasSeparatedValue =
      inlineValue === undefined && next !== undefined && !next.startsWith("-");
    const value = inlineValue ?? (hasSeparatedValue ? next : true);

    flags[name] = value;

    if (globalFlags.has(name)) {
      index += hasSeparatedValue ? 2 : 1;
      continue;
    }

    argvForArgc.push(
      inlineValue === undefined ? `--${name}` : `--${name}=${inlineValue}`
    );
    if (hasSeparatedValue) {
      argvForArgc.push(next);
      index += 2;
      continue;
    }

    index += 1;
  }

  return {
    flags,
    positionals,
    raw: input.argv,
    argvForArgc,
  };
}

function collectCommandPath(argv: string[], schema: Router): string[] {
  const first = argv[0];
  if (!first || first.startsWith("--") || first.startsWith("@")) {
    return [];
  }
  if (first.includes(".")) {
    return [first];
  }

  let current = schema;
  const path: string[] = [];

  for (const token of argv) {
    if (token.startsWith("--") || token.startsWith("{") || token === "-") {
      break;
    }

    const children = getChildren(current);
    if (!(token in children)) {
      break;
    }

    path.push(token);
    current = children[token]!;

    if (isCommand(current)) {
      break;
    }
  }

  return path;
}

function getChildren(router: Router): Record<string, Router> {
  const value = router as {
    "~argc.group"?: { children: Record<string, Router> };
    "~argc"?: unknown;
  } & Record<string, Router>;

  if (value["~argc.group"]) {
    return value["~argc.group"].children;
  }
  if (value["~argc"]) {
    return {};
  }

  return value;
}

function isCommand(router: Router) {
  return (
    router !== null &&
    typeof router === "object" &&
    "~argc" in (router as Record<string, unknown>)
  );
}

function parseLongFlag(token: string) {
  const body = token.slice(2);
  const equalsIndex = body.indexOf("=");
  if (equalsIndex === -1) {
    return { name: body };
  }

  return {
    name: body.slice(0, equalsIndex),
    value: body.slice(equalsIndex + 1),
  };
}

function toCamelCase(value: string) {
  return value.replace(/-([a-z0-9])/g, (_match, char: string) =>
    char.toUpperCase()
  );
}
