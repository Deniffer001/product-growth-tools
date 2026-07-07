/**
 * @input CLI services plus inbound link dataset or entity input
 * @output raw Bing Webmaster inbound link pages and details
 * @pos link read handlers for Bing Webmaster CLI
 */

import type { CliContext } from "../context";
import { runCliCommand } from "../lib/command-support";
import {
  validateAbsoluteUrl,
  validatePage,
  validateSiteUrl,
} from "../lib/input-validation";

type LinkPagesInput = {
  siteUrl?: string;
  page?: number;
};

type LinkEntityInput = LinkPagesInput & {
  link: string;
};

function resolveSiteUrl(input: { siteUrl?: string }, context: CliContext) {
  return validateSiteUrl(input.siteUrl ?? context.siteUrl);
}

function renderLinkPages(data: { method: string; siteUrl: string; page: number }) {
  return [
    `Method: ${data.method}`,
    `Site: ${data.siteUrl}`,
    `Page: ${data.page}`,
  ];
}

export async function handleLinkDatasetPages(args: {
  input: LinkPagesInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const siteUrl = resolveSiteUrl(args.input, services.context);
    const page = validatePage(args.input.page);
    const response = await services
      .getBingWebmasterClient()
      .getLinkCounts({ siteUrl, page });

    services.output.success(
      {
        method: "GetLinkCounts",
        siteUrl,
        page,
        response,
      },
      renderLinkPages
    );
  });
}

export async function handleLinkEntityUrl(args: {
  input: LinkEntityInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const siteUrl = resolveSiteUrl(args.input, services.context);
    const link = validateAbsoluteUrl(args.input.link, "link");
    const page = validatePage(args.input.page);
    const response = await services
      .getBingWebmasterClient()
      .getUrlLinks({ siteUrl, link, page });

    services.output.success(
      {
        method: "GetUrlLinks",
        siteUrl,
        link,
        page,
        response,
      },
      renderLinkPages
    );
  });
}
