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

export type PageMeta = {
  robots: string | null;
  viewport: string | null;
  language: string | null;
  hreflang: Array<{ lang: string; url: string }>;
  alternates: Array<{ rel: string; url: string; type?: string }>;
};

export type PageStructuredData = {
  types: string[];
  softwareApplication: unknown[];
  faqPage: unknown[];
  article: unknown[];
  breadcrumbList: unknown[];
  organization: unknown[];
  product: unknown[];
};

export type PageContentStats = {
  wordCount: number;
  headingCount: number;
  linkCount: number;
  internalLinkCount: number;
  externalLinkCount: number;
  hasPricing: boolean;
  hasComparison: boolean;
  hasFaq: boolean;
  hasCta: boolean;
};

export type PageSections = {
  hero: null | {
    headline: string | null;
    subcopy: string | null;
    ctas: string[];
  };
  ctas: string[];
  featureBlocks: Array<{ heading: string | null; text: string | null }>;
  faqItems: Array<{ question: string; answer: string | null }>;
  pricingSnippets: string[];
  testimonials: Array<{ quote: string; author: string | null }>;
  comparisonRows: Array<{
    subject: string | null;
    competitor: string | null;
    claim: string | null;
  }>;
};

export type PageEntities = {
  brands: string[];
  competitors: string[];
  products: string[];
  categories: string[];
  integrations: string[];
  useCases: string[];
  audiences: string[];
};

export type PageMedia = {
  images: Array<{ url: string | null; alt: string | null }>;
  videos: Array<{ url: string | null; title: string | null }>;
  embeds: Array<{ url: string | null; type: string | null }>;
};

export type PageExtractArtifact = {
  url: string;
  finalUrl: string;
  capturedAt: string;
  provider: "ctx";
  title: string | null;
  description: string | null;
  canonical: string | null;
  meta: PageMeta;
  headings: Array<{ level: number; text: string }>;
  jsonLd: unknown[];
  structuredData: PageStructuredData;
  openGraph: Record<string, string>;
  links: PageLink[];
  contentStats: PageContentStats;
  sections: PageSections;
  entities: PageEntities;
  media: PageMedia;
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
  "finalUrl, title, description, canonical, meta, headings, jsonLd, openGraph, sections, entities, media.",
  "headings must be an array of objects with level and text.",
  "meta must include robots, viewport, language, hreflang, alternates.",
  "jsonLd must be an array. openGraph must be an object of string values.",
  "sections must include hero, ctas, featureBlocks, faqItems, pricingSnippets, testimonials, comparisonRows.",
  "entities must include brands, competitors, products, categories, integrations, useCases, audiences.",
  "media must include images, videos, embeds.",
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
      const headings = normalizeHeadings(structured.headings);
      const jsonLd = Array.isArray(structured.jsonLd) ? structured.jsonLd : [];
      const linksArtifact = normalizeLinks(links.stdout, request.url);
      const sections = normalizeSections(structured.sections);

      return {
        url: request.url,
        finalUrl: normalizeString(structured.finalUrl) ?? request.url,
        capturedAt: new Date().toISOString(),
        provider: "ctx",
        title: normalizeString(structured.title),
        description: normalizeString(structured.description),
        canonical: normalizeString(structured.canonical),
        meta: normalizeMeta(structured.meta),
        headings,
        jsonLd,
        structuredData: summarizeStructuredData(jsonLd),
        openGraph: normalizeStringRecord(structured.openGraph),
        links: linksArtifact,
        contentStats: buildContentStats({
          mainText,
          headings,
          links: linksArtifact,
          sections,
        }),
        sections,
        entities: normalizeEntities(structured.entities),
        media: normalizeMedia(structured.media),
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

function normalizeMeta(value: unknown): PageMeta {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyMeta();
  }

  return {
    robots: normalizeString(Reflect.get(value, "robots")),
    viewport: normalizeString(Reflect.get(value, "viewport")),
    language:
      normalizeString(Reflect.get(value, "language")) ??
      normalizeString(Reflect.get(value, "lang")),
    hreflang: normalizeHreflang(Reflect.get(value, "hreflang")),
    alternates: normalizeAlternates(Reflect.get(value, "alternates")),
  };
}

function emptyMeta(): PageMeta {
  return {
    robots: null,
    viewport: null,
    language: null,
    hreflang: [],
    alternates: [],
  };
}

function normalizeHreflang(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as Array<{ lang: string; url: string }>;
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const lang =
      normalizeString(Reflect.get(entry, "lang")) ??
      normalizeString(Reflect.get(entry, "hreflang"));
    const url =
      normalizeString(Reflect.get(entry, "url")) ??
      normalizeString(Reflect.get(entry, "href"));

    if (!lang || !url) {
      return [];
    }

    return [{ lang, url }];
  });
}

function normalizeAlternates(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as Array<{ rel: string; url: string; type?: string }>;
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const rel = normalizeString(Reflect.get(entry, "rel"));
    const url =
      normalizeString(Reflect.get(entry, "url")) ??
      normalizeString(Reflect.get(entry, "href"));

    if (!rel || !url) {
      return [];
    }

    return [
      {
        rel,
        url,
        type: normalizeString(Reflect.get(entry, "type")) ?? undefined,
      },
    ];
  });
}

function summarizeStructuredData(jsonLd: unknown[]): PageStructuredData {
  const entries = flattenJsonLdEntries(jsonLd);
  const types = uniqueStrings(entries.flatMap((entry) => readSchemaTypes(entry)));

  return {
    types,
    softwareApplication: filterSchemaEntries(entries, "SoftwareApplication"),
    faqPage: filterSchemaEntries(entries, "FAQPage"),
    article: filterSchemaEntries(entries, "Article"),
    breadcrumbList: filterSchemaEntries(entries, "BreadcrumbList"),
    organization: filterSchemaEntries(entries, "Organization"),
    product: filterSchemaEntries(entries, "Product"),
  };
}

function flattenJsonLdEntries(values: unknown[]): Record<string, unknown>[] {
  const entries: Record<string, unknown>[] = [];

  for (const value of values) {
    collectJsonLdEntry(value, entries);
  }

  return entries;
}

function collectJsonLdEntry(
  value: unknown,
  entries: Record<string, unknown>[]
) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectJsonLdEntry(item, entries);
    }
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  const entry = value as Record<string, unknown>;
  entries.push(entry);

  const graph = Reflect.get(entry, "@graph");
  if (Array.isArray(graph)) {
    for (const graphEntry of graph) {
      collectJsonLdEntry(graphEntry, entries);
    }
  }
}

function readSchemaTypes(entry: Record<string, unknown>) {
  const type = Reflect.get(entry, "@type");
  return normalizeStringArray(Array.isArray(type) ? type : [type]);
}

function filterSchemaEntries(entries: Record<string, unknown>[], type: string) {
  return entries.filter((entry) => readSchemaTypes(entry).includes(type));
}

function normalizeSections(value: unknown): PageSections {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptySections();
  }

  return {
    hero: normalizeHero(Reflect.get(value, "hero")),
    ctas: normalizeStringArray(Reflect.get(value, "ctas")),
    featureBlocks: normalizeFeatureBlocks(Reflect.get(value, "featureBlocks")),
    faqItems: normalizeFaqItems(Reflect.get(value, "faqItems")),
    pricingSnippets: normalizeStringArray(Reflect.get(value, "pricingSnippets")),
    testimonials: normalizeTestimonials(Reflect.get(value, "testimonials")),
    comparisonRows: normalizeComparisonRows(
      Reflect.get(value, "comparisonRows")
    ),
  };
}

function emptySections(): PageSections {
  return {
    hero: null,
    ctas: [],
    featureBlocks: [],
    faqItems: [],
    pricingSnippets: [],
    testimonials: [],
    comparisonRows: [],
  };
}

function normalizeHero(value: unknown): PageSections["hero"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return {
    headline:
      normalizeString(Reflect.get(value, "headline")) ??
      normalizeString(Reflect.get(value, "title")),
    subcopy:
      normalizeString(Reflect.get(value, "subcopy")) ??
      normalizeString(Reflect.get(value, "description")),
    ctas: normalizeStringArray(Reflect.get(value, "ctas")),
  };
}

function normalizeFeatureBlocks(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as Array<{ heading: string | null; text: string | null }>;
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    return [
      {
        heading:
          normalizeString(Reflect.get(entry, "heading")) ??
          normalizeString(Reflect.get(entry, "title")),
        text:
          normalizeString(Reflect.get(entry, "text")) ??
          normalizeString(Reflect.get(entry, "body")),
      },
    ];
  });
}

function normalizeFaqItems(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as Array<{ question: string; answer: string | null }>;
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const question = normalizeString(Reflect.get(entry, "question"));
    if (!question) {
      return [];
    }

    return [
      {
        question,
        answer: normalizeString(Reflect.get(entry, "answer")),
      },
    ];
  });
}

function normalizeTestimonials(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as Array<{ quote: string; author: string | null }>;
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const quote =
      normalizeString(Reflect.get(entry, "quote")) ??
      normalizeString(Reflect.get(entry, "text"));
    if (!quote) {
      return [];
    }

    return [
      {
        quote,
        author: normalizeString(Reflect.get(entry, "author")),
      },
    ];
  });
}

function normalizeComparisonRows(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as PageSections["comparisonRows"];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    return [
      {
        subject: normalizeString(Reflect.get(entry, "subject")),
        competitor: normalizeString(Reflect.get(entry, "competitor")),
        claim:
          normalizeString(Reflect.get(entry, "claim")) ??
          normalizeString(Reflect.get(entry, "text")),
      },
    ];
  });
}

function normalizeEntities(value: unknown): PageEntities {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyEntities();
  }

  return {
    brands: uniqueStrings(normalizeStringArray(Reflect.get(value, "brands"))),
    competitors: uniqueStrings(
      normalizeStringArray(Reflect.get(value, "competitors"))
    ),
    products: uniqueStrings(
      normalizeStringArray(Reflect.get(value, "products"))
    ),
    categories: uniqueStrings(
      normalizeStringArray(Reflect.get(value, "categories"))
    ),
    integrations: uniqueStrings(
      normalizeStringArray(Reflect.get(value, "integrations"))
    ),
    useCases: uniqueStrings(
      normalizeStringArray(Reflect.get(value, "useCases"))
    ),
    audiences: uniqueStrings(
      normalizeStringArray(Reflect.get(value, "audiences"))
    ),
  };
}

function emptyEntities(): PageEntities {
  return {
    brands: [],
    competitors: [],
    products: [],
    categories: [],
    integrations: [],
    useCases: [],
    audiences: [],
  };
}

function normalizeMedia(value: unknown): PageMedia {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyMedia();
  }

  return {
    images: normalizeImageEntries(Reflect.get(value, "images")),
    videos: normalizeVideoEntries(Reflect.get(value, "videos")),
    embeds: normalizeEmbedEntries(Reflect.get(value, "embeds")),
  };
}

function emptyMedia(): PageMedia {
  return {
    images: [],
    videos: [],
    embeds: [],
  };
}

function normalizeImageEntries(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as PageMedia["images"];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    return [
      {
        url:
          normalizeString(Reflect.get(entry, "url")) ??
          normalizeString(Reflect.get(entry, "src")),
        alt: normalizeString(Reflect.get(entry, "alt")),
      },
    ];
  });
}

function normalizeVideoEntries(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as PageMedia["videos"];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    return [
      {
        url:
          normalizeString(Reflect.get(entry, "url")) ??
          normalizeString(Reflect.get(entry, "src")),
        title: normalizeString(Reflect.get(entry, "title")),
      },
    ];
  });
}

function normalizeEmbedEntries(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as PageMedia["embeds"];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    return [
      {
        url:
          normalizeString(Reflect.get(entry, "url")) ??
          normalizeString(Reflect.get(entry, "src")),
        type: normalizeString(Reflect.get(entry, "type")),
      },
    ];
  });
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

function buildContentStats(input: {
  mainText: string;
  headings: Array<{ level: number; text: string }>;
  links: PageLink[];
  sections: PageSections;
}): PageContentStats {
  const text = input.mainText.toLowerCase();
  const internalLinkCount = input.links.filter(
    (link) => link.kind === "internal"
  ).length;
  const externalLinkCount = input.links.filter(
    (link) => link.kind === "external"
  ).length;

  return {
    wordCount: countWords(input.mainText),
    headingCount: input.headings.length,
    linkCount: input.links.length,
    internalLinkCount,
    externalLinkCount,
    hasPricing:
      input.sections.pricingSnippets.length > 0 ||
      includesAny(text, ["pricing", "price", "plans", "$", "billing"]),
    hasComparison:
      input.sections.comparisonRows.length > 0 ||
      includesAny(text, ["compare", "comparison", "alternative", "vs "]),
    hasFaq:
      input.sections.faqItems.length > 0 ||
      includesAny(text, ["faq", "frequently asked"]),
    hasCta:
      input.sections.ctas.length > 0 ||
      Boolean(input.sections.hero?.ctas.length) ||
      includesAny(text, ["get started", "try", "download", "sign up"]),
  };
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value.flatMap((entry) => {
    const text = normalizeString(entry);
    return text ? [text] : [];
  });
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(value);
  }

  return output;
}

function countWords(value: string) {
  return value.match(/[A-Za-z0-9]+|[\u4e00-\u9fff]/g)?.length ?? 0;
}

function includesAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle));
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
