/**
 * @input CLI services plus URL entity input
 * @output raw Bing Webmaster URL index and traffic reads
 * @pos URL read handlers for Bing Webmaster CLI
 */

import type { CliContext } from "../context";
import { runCliCommand } from "../lib/command-support";
import {
  validateBingUrlTarget,
  validateSiteUrl,
} from "../lib/input-validation";

type UrlEntityInput = {
  siteUrl?: string;
  url: string;
};

function resolveSiteUrl(input: UrlEntityInput, context: CliContext) {
  return validateSiteUrl(input.siteUrl ?? context.siteUrl);
}

function renderUrlEntity(data: { method: string; siteUrl: string; url: string }) {
  return [`Method: ${data.method}`, `Site: ${data.siteUrl}`, `URL: ${data.url}`];
}

export async function handleUrlEntityInfo(args: {
  input: UrlEntityInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const siteUrl = resolveSiteUrl(args.input, services.context);
    const url = validateBingUrlTarget(args.input.url, "url");
    const info = await services
      .getBingWebmasterClient()
      .getUrlInfo({ siteUrl, url });

    services.output.success(
      {
        method: "GetUrlInfo",
        siteUrl,
        url,
        info,
      },
      renderUrlEntity
    );
  });
}

export async function handleUrlEntityTraffic(args: {
  input: UrlEntityInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const siteUrl = resolveSiteUrl(args.input, services.context);
    const url = validateBingUrlTarget(args.input.url, "url");
    const traffic = await services
      .getBingWebmasterClient()
      .getUrlTrafficInfo({ siteUrl, url });

    services.output.success(
      {
        method: "GetUrlTrafficInfo",
        siteUrl,
        url,
        traffic,
      },
      renderUrlEntity
    );
  });
}
