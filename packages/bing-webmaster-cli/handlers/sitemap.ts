/**
 * @input CLI services plus feed dataset or entity input
 * @output raw Bing Webmaster feed and sitemap reads
 * @pos sitemap read handlers for Bing Webmaster CLI
 */

import type { CliContext } from "../context";
import { runCliCommand } from "../lib/command-support";
import {
  validateAbsoluteUrl,
  validateSiteUrl,
} from "../lib/input-validation";

type FeedListInput = {
  siteUrl?: string;
};

type FeedEntityInput = FeedListInput & {
  feedUrl: string;
};

function resolveSiteUrl(input: FeedListInput, context: CliContext) {
  return validateSiteUrl(input.siteUrl ?? context.siteUrl);
}

function renderFeeds(data: { method: string; siteUrl: string; rowCount: number }) {
  return [
    `Method: ${data.method}`,
    `Site: ${data.siteUrl}`,
    `Rows: ${data.rowCount}`,
  ];
}

function rowCount(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

export async function handleSitemapDatasetFeeds(args: {
  input: FeedListInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const siteUrl = resolveSiteUrl(args.input, services.context);
    const feeds = await services.getBingWebmasterClient().getFeeds({ siteUrl });

    services.output.success(
      {
        method: "GetFeeds",
        siteUrl,
        rowCount: rowCount(feeds),
        feeds,
      },
      renderFeeds
    );
  });
}

export async function handleSitemapEntityFeed(args: {
  input: FeedEntityInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const siteUrl = resolveSiteUrl(args.input, services.context);
    const feedUrl = validateAbsoluteUrl(args.input.feedUrl, "feedUrl");
    const feeds = await services
      .getBingWebmasterClient()
      .getFeedDetails({ siteUrl, feedUrl });

    services.output.success(
      {
        method: "GetFeedDetails",
        siteUrl,
        feedUrl,
        rowCount: rowCount(feeds),
        feeds,
      },
      renderFeeds
    );
  });
}
