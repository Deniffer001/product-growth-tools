/**
 * @input CLI services plus site dataset input
 * @output accessible Bing Webmaster site inventory
 * @pos site read handlers for Bing Webmaster CLI
 */

import type { CliContext } from "../context";
import { runCliCommand } from "../lib/command-support";

type SiteListInput = Record<string, never>;

function renderSites(data: { count: number; sites: unknown }) {
  return [`Sites: ${data.count}`];
}

function countRows(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

export async function handleSiteDatasetSites(args: {
  input: SiteListInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const sites = await services.getBingWebmasterClient().getUserSites();

    services.output.success(
      {
        count: countRows(sites),
        sites,
      },
      renderSites
    );
  });
}
