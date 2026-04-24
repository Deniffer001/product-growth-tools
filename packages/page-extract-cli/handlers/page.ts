/**
 * @input CLI services plus page extraction request input
 * @output normalized page extraction artifact
 * @pos page extraction handler for ctx-backed provider reads
 */

import type { CliContext } from "../context";
import {
  validateAbsoluteHttpUrl,
  validateProvider,
  validateScreenshotOutput,
} from "../lib/input-validation";
import { runCliCommand } from "../lib/command-support";

export type PageExtractInput = {
  url: string;
  provider?: string;
  screenshot?: boolean;
  screenshotOutput?: string;
};

function normalizeInput(input: PageExtractInput) {
  return {
    url: validateAbsoluteHttpUrl(input.url),
    provider: validateProvider(input.provider),
    screenshot: input.screenshot ?? false,
    screenshotOutput: validateScreenshotOutput(input.screenshotOutput),
  };
}

function renderPageExtract(data: { url: string; title: string | null }) {
  return [
    `URL: ${data.url}`,
    `Title: ${data.title ?? "(missing)"}`,
    `Provider: ctx`,
  ];
}

export async function handlePageEntityExtract(args: {
  input: PageExtractInput;
  context: CliContext;
}) {
  await runCliCommand(args.context, async (services) => {
    const input = normalizeInput(args.input);
    const artifact = await services.getPageExtractClient().extract(input);

    services.output.success(artifact, renderPageExtract);
  });
}
