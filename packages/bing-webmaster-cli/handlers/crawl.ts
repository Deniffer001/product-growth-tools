/**
 * @input CLI services plus crawl dataset or entity input
 * @output raw Bing Webmaster crawl datasets and settings
 * @pos crawl read handlers for Bing Webmaster CLI
 */

import type { CliContext } from "../context";
import { runCliCommand } from "../lib/command-support";
import { validateSiteUrl } from "../lib/input-validation";

type SiteScopedInput = {
  siteUrl?: string;
};

function resolveSiteUrl(input: SiteScopedInput, context: CliContext) {
  return validateSiteUrl(input.siteUrl ?? context.siteUrl);
}

function renderDataset(data: { method: string; siteUrl: string; rowCount: number }) {
  return [
    `Method: ${data.method}`,
    `Site: ${data.siteUrl}`,
    `Rows: ${data.rowCount}`,
  ];
}

function renderEntity(data: { method: string; siteUrl: string }) {
  return [`Method: ${data.method}`, `Site: ${data.siteUrl}`];
}

function rowCount(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

export async function handleCrawlDatasetStats(args: {
  input: SiteScopedInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const siteUrl = resolveSiteUrl(args.input, services.context);
    const rows = await services
      .getBingWebmasterClient()
      .getCrawlStats({ siteUrl });

    services.output.success(
      {
        method: "GetCrawlStats",
        siteUrl,
        rowCount: rowCount(rows),
        rows,
      },
      renderDataset
    );
  });
}

export async function handleCrawlDatasetIssues(args: {
  input: SiteScopedInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const siteUrl = resolveSiteUrl(args.input, services.context);
    const rows = await services
      .getBingWebmasterClient()
      .getCrawlIssues({ siteUrl });

    services.output.success(
      {
        method: "GetCrawlIssues",
        siteUrl,
        rowCount: rowCount(rows),
        rows,
      },
      renderDataset
    );
  });
}

export async function handleCrawlEntitySettings(args: {
  input: SiteScopedInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const siteUrl = resolveSiteUrl(args.input, services.context);
    const settings = await services
      .getBingWebmasterClient()
      .getCrawlSettings({ siteUrl });

    services.output.success(
      {
        method: "GetCrawlSettings",
        siteUrl,
        settings,
      },
      renderEntity
    );
  });
}
