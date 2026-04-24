/**
 * @input ctx CLI subprocesses and page extraction requests
 * @output normalized page extraction artifacts for SEO and GEO workflows
 * @pos provider adapter that keeps ctx execution behind a stable data contract
 */

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { cliError } from "./lib/errors";

export type PageLink = {
  url: string;
  text?: string;
  rel?: string;
  kind: "internal" | "external";
};

export type PageExtractArtifact = {
  url: string;
  finalUrl: string;
  capturedAt: string;
  provider: "ctx";
  title: string | null;
  description: string | null;
  canonical: string | null;
  headings: Array<{ level: number; text: string }>;
  jsonLd: unknown[];
  openGraph: Record<string, string>;
  links: PageLink[];
  mainText: string;
  mainMarkdown: string;
  contentHash: string;
  screenshot: null | {
    requested: true;
    path: string | null;
    stdout: string;
  };
};

export type PageExtractRequest = {
  url: string;
  provider: "ctx";
  screenshot: boolean;
  screenshotOutput?: string;
};

export type PageExtractClient = {
  extract: (input: PageExtractRequest) => Promise<PageExtractArtifact>;
};

type ProcessRunner = (
  command: string,
  args: string[]
) => Promise<{ stdout: string; stderr: string; status: number | null }>;

const SEO_JSON_PROMPT = [
  "Extract SEO and GEO page facts from this webpage.",
  "Return strict JSON only with keys:",
  "finalUrl, title, description, canonical, headings, jsonLd, openGraph.",
  "headings must be an array of objects with level and text.",
  "jsonLd must be an array. openGraph must be an object of string values.",
].join(" ");

export function createPageExtractClient(input?: {
  ctxBin?: string;
  runner?: ProcessRunner;
}): PageExtractClient {
  const ctxBin = input?.ctxBin ?? "ctx";
  const runner = input?.runner ?? runProcess;

  return {
    async extract(request) {
      const [read, metadata, links, screenshot] = await Promise.all([
        runCtx(runner, ctxBin, ["read", request.url]),
        runCtx(runner, ctxBin, [
          "json",
          request.url,
          "--prompt",
          SEO_JSON_PROMPT,
        ]),
        runCtx(runner, ctxBin, ["links", request.url]),
        request.screenshot
          ? runCtx(runner, ctxBin, [
              "screenshot",
              request.url,
              ...(request.screenshotOutput
                ? ["--output", request.screenshotOutput]
                : []),
            ])
          : Promise.resolve(null),
      ]);

      const structured = parseStructuredMetadata(metadata.stdout);
      const mainMarkdown = read.stdout.trim();
      const mainText = markdownToText(mainMarkdown);

      return {
        url: request.url,
        finalUrl: normalizeString(structured.finalUrl) ?? request.url,
        capturedAt: new Date().toISOString(),
        provider: "ctx",
        title: normalizeString(structured.title),
        description: normalizeString(structured.description),
        canonical: normalizeString(structured.canonical),
        headings: normalizeHeadings(structured.headings),
        jsonLd: Array.isArray(structured.jsonLd) ? structured.jsonLd : [],
        openGraph: normalizeStringRecord(structured.openGraph),
        links: normalizeLinks(links.stdout, request.url),
        mainText,
        mainMarkdown,
        contentHash: hashContent(mainText),
        screenshot: screenshot
          ? {
              requested: true,
              path:
                request.screenshotOutput ??
                inferScreenshotPath(screenshot.stdout) ??
                null,
              stdout: screenshot.stdout.trim(),
            }
          : null,
      };
    },
  };
}

async function runCtx(
  runner: ProcessRunner,
  ctxBin: string,
  args: string[]
) {
  const result = await runner(ctxBin, args);

  if (result.status !== 0) {
    throw cliError({
      code: "backend_failure",
      message: `ctx ${args[0] ?? ""} failed.`,
      hint:
        result.stderr.trim() ||
        "Confirm ctx is installed, authenticated when needed, and can read the target URL.",
    });
  }

  return result;
}

function runProcess(command: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string; status: number | null }>(
    (resolve, reject) => {
      const child = spawn(command, args, {
        stdio: ["ignore", "pipe", "pipe"],
      });
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];

      child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
      child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
      child.on("error", reject);
      child.on("close", (status) => {
        resolve({
          stdout: Buffer.concat(stdout).toString("utf8"),
          stderr: Buffer.concat(stderr).toString("utf8"),
          status,
        });
      });
    }
  );
}

function parseStructuredMetadata(stdout: string): Record<string, unknown> {
  const parsed = parseJsonLike(stdout);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    if ("ok" in parsed && "data" in parsed) {
      const data = Reflect.get(parsed, "data");
      if (data && typeof data === "object" && !Array.isArray(data)) {
        return data as Record<string, unknown>;
      }
    }
    return parsed as Record<string, unknown>;
  }
  return {};
}

function parseJsonLike(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1]);
    }
    const objectStart = trimmed.indexOf("{");
    const objectEnd = trimmed.lastIndexOf("}");
    if (objectStart >= 0 && objectEnd > objectStart) {
      return JSON.parse(trimmed.slice(objectStart, objectEnd + 1));
    }
    return null;
  }
}

function normalizeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeHeadings(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as Array<{ level: number; text: string }>;
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }
    const level = Reflect.get(entry, "level");
    const text = normalizeString(Reflect.get(entry, "text"));

    if (
      typeof level !== "number" ||
      !Number.isInteger(level) ||
      level < 1 ||
      level > 6 ||
      !text
    ) {
      return [];
    }

    return [{ level, text }];
  });
}

function normalizeStringRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const output: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") {
      output[key] = entry;
    }
  }
  return output;
}

function normalizeLinks(stdout: string, sourceUrl: string) {
  const parsed = parseJsonLike(stdout);
  const sourceHost = new URL(sourceUrl).hostname;
  const rawEntries = Array.isArray(parsed)
    ? parsed
    : stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

  const seen = new Set<string>();
  const links: PageLink[] = [];

  for (const entry of rawEntries) {
    const link = normalizeLinkEntry(entry, sourceHost);
    if (!link || seen.has(link.url)) {
      continue;
    }
    seen.add(link.url);
    links.push(link);
  }

  return links;
}

function normalizeLinkEntry(entry: unknown, sourceHost: string): PageLink | null {
  if (typeof entry === "string") {
    return normalizeLinkUrl(entry, sourceHost);
  }

  if (!entry || typeof entry !== "object") {
    return null;
  }

  const url =
    normalizeString(Reflect.get(entry, "url")) ??
    normalizeString(Reflect.get(entry, "href"));
  if (!url) {
    return null;
  }

  const link = normalizeLinkUrl(url, sourceHost);
  if (!link) {
    return null;
  }

  return {
    ...link,
    text: normalizeString(Reflect.get(entry, "text")) ?? undefined,
    rel: normalizeString(Reflect.get(entry, "rel")) ?? undefined,
  };
}

function normalizeLinkUrl(value: string, sourceHost: string): PageLink | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return {
      url: url.toString(),
      kind: url.hostname === sourceHost ? "internal" : "external",
    };
  } catch {
    return null;
  }
}

function markdownToText(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hashContent(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function inferScreenshotPath(stdout: string) {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return null;
  }

  const pngMatch = trimmed.match(/(?:[./~\w-][^\s]*\.png)/);
  return pngMatch?.[0] ?? null;
}
