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
              meta: {
                robots: "index,follow",
                viewport: "width=device-width, initial-scale=1",
                language: "en",
                hreflang: [
                  { lang: "en", url: "https://example.com/blog/seo" },
                ],
                alternates: [
                  {
                    rel: "alternate",
                    type: "application/rss+xml",
                    url: "https://example.com/rss.xml",
                  },
                ],
              },
              headings: [
                { level: 1, text: "Build SEO Pages" },
                { level: 2, text: "FAQ" },
              ],
              jsonLd: [
                { "@type": "Article" },
                { "@type": "FAQPage", mainEntity: [] },
              ],
              openGraph: { "og:title": "Build SEO Pages" },
              sections: {
                hero: {
                  headline: "Build SEO Pages",
                  subcopy: "Useful content for extraction.",
                  ctas: ["Get started"],
                },
                ctas: ["Download"],
                featureBlocks: [
                  { heading: "Content extraction", text: "Extract page facts." },
                ],
                faqItems: [
                  {
                    question: "What is page extraction?",
                    answer: "A structured page read.",
                  },
                ],
                pricingSnippets: ["Plans start at $10."],
                testimonials: [{ quote: "Useful for SEO.", author: "A marketer" }],
                comparisonRows: [
                  {
                    subject: "Example",
                    competitor: "Other",
                    claim: "More structured facts.",
                  },
                ],
              },
              entities: {
                brands: ["Example"],
                competitors: ["Other"],
                products: ["Page Extract"],
                categories: ["SEO tooling"],
                integrations: ["ctx"],
                useCases: ["competitor research"],
                audiences: ["marketers"],
              },
              media: {
                images: [
                  {
                    url: "https://example.com/hero.png",
                    alt: "Hero screenshot",
                  },
                ],
                videos: [{ url: "https://example.com/demo.mp4", title: "Demo" }],
                embeds: [
                  {
                    url: "https://youtube.com/watch?v=demo",
                    type: "youtube",
                  },
                ],
              },
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
    expect(result.headings).toEqual([
      { level: 1, text: "Build SEO Pages" },
      { level: 2, text: "FAQ" },
    ]);
    expect(result.meta).toEqual({
      robots: "index,follow",
      viewport: "width=device-width, initial-scale=1",
      language: "en",
      hreflang: [{ lang: "en", url: "https://example.com/blog/seo" }],
      alternates: [
        {
          rel: "alternate",
          type: "application/rss+xml",
          url: "https://example.com/rss.xml",
        },
      ],
    });
    expect(result.structuredData).toEqual(
      expect.objectContaining({
        types: ["Article", "FAQPage"],
        article: [{ "@type": "Article" }],
        faqPage: [{ "@type": "FAQPage", mainEntity: [] }],
      })
    );
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
    expect(result.contentStats).toEqual({
      wordCount: 7,
      headingCount: 2,
      linkCount: 2,
      internalLinkCount: 1,
      externalLinkCount: 1,
      hasPricing: true,
      hasComparison: true,
      hasFaq: true,
      hasCta: true,
    });
    expect(result.sections.hero?.headline).toBe("Build SEO Pages");
    expect(result.sections.faqItems).toEqual([
      {
        question: "What is page extraction?",
        answer: "A structured page read.",
      },
    ]);
    expect(result.entities).toEqual({
      brands: ["Example"],
      competitors: ["Other"],
      products: ["Page Extract"],
      categories: ["SEO tooling"],
      integrations: ["ctx"],
      useCases: ["competitor research"],
      audiences: ["marketers"],
    });
    expect(result.media).toEqual({
      images: [{ url: "https://example.com/hero.png", alt: "Hero screenshot" }],
      videos: [{ url: "https://example.com/demo.mp4", title: "Demo" }],
      embeds: [{ url: "https://youtube.com/watch?v=demo", type: "youtube" }],
    });
    expect(result.contentHash).toHaveLength(64);
    expect(calls.map((call) => call[1])).toEqual([
      "read",
      "json",
      "links",
      "screenshot",
    ]);
  });
});
