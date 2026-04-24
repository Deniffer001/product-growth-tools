/**
 * @input mocked ctx subprocess outputs
 * @output coverage for normalized page extraction artifacts
 * @pos provider behavior tests for ctx-backed page extraction
 */

import { describe, expect, test } from "vitest";
import { createPageExtractClient } from "./provider";

describe("page-extract provider", () => {
  test("normalizes ctx read, json, links, and screenshot outputs", async () => {
    const calls: string[][] = [];
    const client = createPageExtractClient({
      ctxBin: "ctx",
      runner: async (command, args) => {
        calls.push([command, ...args]);
        const action = args[0];

        if (action === "read") {
          return {
            status: 0,
            stderr: "",
            stdout: "# Build SEO Pages\n\nUseful content for extraction.",
          };
        }

        if (action === "json") {
          return {
            status: 0,
            stderr: "",
            stdout: JSON.stringify({
              finalUrl: "https://example.com/blog/seo",
              title: "Build SEO Pages",
              description: "A practical SEO guide.",
              canonical: "https://example.com/blog/seo",
              headings: [{ level: 1, text: "Build SEO Pages" }],
              jsonLd: [{ "@type": "Article" }],
              openGraph: { "og:title": "Build SEO Pages" },
            }),
          };
        }

        if (action === "links") {
          return {
            status: 0,
            stderr: "",
            stdout: JSON.stringify([
              { url: "https://example.com/about", text: "About" },
              { url: "https://other.example/tool", text: "Tool" },
            ]),
          };
        }

        return {
          status: 0,
          stderr: "",
          stdout: "saved screenshot to ./artifacts/page.png",
        };
      },
    });

    const result = await client.extract({
      url: "https://example.com/blog/seo",
      provider: "ctx",
      screenshot: true,
      screenshotOutput: "./artifacts/page.png",
    });

    expect(result).toEqual(
      expect.objectContaining({
        url: "https://example.com/blog/seo",
        finalUrl: "https://example.com/blog/seo",
        provider: "ctx",
        title: "Build SEO Pages",
        description: "A practical SEO guide.",
        canonical: "https://example.com/blog/seo",
        mainText: "Build SEO Pages Useful content for extraction.",
        screenshot: expect.objectContaining({
          requested: true,
          path: "./artifacts/page.png",
        }),
      })
    );
    expect(result.headings).toEqual([{ level: 1, text: "Build SEO Pages" }]);
    expect(result.links).toEqual([
      {
        url: "https://example.com/about",
        text: "About",
        kind: "internal",
      },
      {
        url: "https://other.example/tool",
        text: "Tool",
        kind: "external",
      },
    ]);
    expect(result.contentHash).toHaveLength(64);
    expect(calls.map((call) => call[1])).toEqual([
      "read",
      "json",
      "links",
      "screenshot",
    ]);
  });
});
