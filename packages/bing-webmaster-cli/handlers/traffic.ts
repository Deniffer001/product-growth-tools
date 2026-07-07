/**
 * @input CLI services plus traffic dataset or entity input
 * @output raw Bing Webmaster traffic datasets and focused entities
 * @pos traffic read handlers for Bing Webmaster CLI
 */

import type { CliContext } from "../context";
import { runCliCommand } from "../lib/command-support";
import {
  validateAbsoluteUrl,
  validateRequiredText,
  validateSiteUrl,
} from "../lib/input-validation";

type SiteScopedInput = {
  siteUrl?: string;
};

type QueryInput = SiteScopedInput & {
  query: string;
};

type PageInput = SiteScopedInput & {
  pageUrl: string;
};

type QueryPageInput = SiteScopedInput & {
  query: string;
  pageUrl: string;
};

function resolveSiteUrl(input: SiteScopedInput, context: CliContext) {
  return validateSiteUrl(input.siteUrl ?? context.siteUrl);
}

function renderTraffic(data: { method: string; siteUrl: string; rowCount: number }) {
  return [
    `Method: ${data.method}`,
    `Site: ${data.siteUrl}`,
    `Rows: ${data.rowCount}`,
  ];
}

function rowCount(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

async function readTrafficDataset(args: {
  context: CliContext;
  input: SiteScopedInput;
  method: "GetRankAndTrafficStats" | "GetQueryStats" | "GetPageStats";
}) {
  await runCliCommand(args.context, async (services) => {
    const siteUrl = resolveSiteUrl(args.input, services.context);
    const client = services.getBingWebmasterClient();
    const rows =
      args.method === "GetRankAndTrafficStats"
        ? await client.getRankAndTrafficStats({ siteUrl })
        : args.method === "GetQueryStats"
          ? await client.getQueryStats({ siteUrl })
          : await client.getPageStats({ siteUrl });

    services.output.success(
      {
        method: args.method,
        siteUrl,
        rowCount: rowCount(rows),
        rows,
      },
      renderTraffic
    );
  });
}

export async function handleTrafficDatasetRank(args: {
  input: SiteScopedInput;
  context: CliContext;
}) {
  await readTrafficDataset({
    context: args.context,
    input: args.input,
    method: "GetRankAndTrafficStats",
  });
}

export async function handleTrafficDatasetQueries(args: {
  input: SiteScopedInput;
  context: CliContext;
}) {
  await readTrafficDataset({
    context: args.context,
    input: args.input,
    method: "GetQueryStats",
  });
}

export async function handleTrafficDatasetPages(args: {
  input: SiteScopedInput;
  context: CliContext;
}) {
  await readTrafficDataset({
    context: args.context,
    input: args.input,
    method: "GetPageStats",
  });
}

export async function handleTrafficEntityQuery(args: {
  input: QueryInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const siteUrl = resolveSiteUrl(args.input, services.context);
    const query = validateRequiredText(args.input.query, "query");
    const rows = await services
      .getBingWebmasterClient()
      .getQueryTrafficStats({ siteUrl, query });

    services.output.success(
      {
        method: "GetQueryTrafficStats",
        siteUrl,
        query,
        rowCount: rowCount(rows),
        rows,
      },
      renderTraffic
    );
  });
}

export async function handleTrafficEntityPageQueries(args: {
  input: PageInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const siteUrl = resolveSiteUrl(args.input, services.context);
    const page = validateAbsoluteUrl(args.input.pageUrl, "pageUrl");
    const rows = await services
      .getBingWebmasterClient()
      .getPageQueryStats({ siteUrl, page });

    services.output.success(
      {
        method: "GetPageQueryStats",
        siteUrl,
        pageUrl: page,
        rowCount: rowCount(rows),
        rows,
      },
      renderTraffic
    );
  });
}

export async function handleTrafficEntityQueryPages(args: {
  input: QueryInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const siteUrl = resolveSiteUrl(args.input, services.context);
    const query = validateRequiredText(args.input.query, "query");
    const rows = await services
      .getBingWebmasterClient()
      .getQueryPageStats({ siteUrl, query });

    services.output.success(
      {
        method: "GetQueryPageStats",
        siteUrl,
        query,
        rowCount: rowCount(rows),
        rows,
      },
      renderTraffic
    );
  });
}

export async function handleTrafficEntityQueryPage(args: {
  input: QueryPageInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const siteUrl = resolveSiteUrl(args.input, services.context);
    const query = validateRequiredText(args.input.query, "query");
    const page = validateAbsoluteUrl(args.input.pageUrl, "pageUrl");
    const rows = await services
      .getBingWebmasterClient()
      .getQueryPageDetailStats({ siteUrl, query, page });

    services.output.success(
      {
        method: "GetQueryPageDetailStats",
        siteUrl,
        query,
        pageUrl: page,
        rowCount: rowCount(rows),
        rows,
      },
      renderTraffic
    );
  });
}
