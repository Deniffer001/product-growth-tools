/**
 * @input temporary product-growth profile artifacts
 * @output funnel preset validation coverage
 * @pos prevents project knowledge artifacts from silently drifting
 */

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { resolveFunnelSelection, validateFunnelPresetFile } from "./funnel-presets";
import type { CliContext } from "../context";

function contextFor(profileDir: string): CliContext {
  return {
    apiBaseUrl: "https://us.posthog.com",
    profile: {
      profile: "test",
      profileRoot: profileDir,
      profileDir,
      profileEnvPath: join(profileDir, ".env"),
      profileEnvFound: false,
      invocationRoot: profileDir,
      invocationEnvPaths: [],
    },
  };
}

describe("funnel preset validation", () => {
  test("accepts versioned funnel preset files", () => {
    const dir = mkdtempSync(join(tmpdir(), "posthog-profile-"));
    writeFileSync(
      join(dir, "posthog.funnels.json"),
      JSON.stringify({
        version: 1,
        funnels: {
          example_funnel: {
            description: "Example funnel",
            requiresReconciliation: true,
            events: ["event.one", "event.two"],
          },
        },
      })
    );

    const result = validateFunnelPresetFile(contextFor(dir));

    expect(result.ok).toBe(true);
    expect(result.version).toBe(1);
    expect(result.funnels).toEqual([
      {
        name: "example_funnel",
        description: "Example funnel",
        eventCount: 2,
        requiresReconciliation: true,
      },
    ]);
  });

  test("rejects unversioned preset files", () => {
    const dir = mkdtempSync(join(tmpdir(), "posthog-profile-"));
    writeFileSync(
      join(dir, "posthog.funnels.json"),
      JSON.stringify({ funnels: { example_funnel: ["event.one"] } })
    );

    const result = validateFunnelPresetFile(contextFor(dir));

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Preset file must set version: 1.");
  });

  test("does not infer reconciliation for explicit event lists", () => {
    const selection = resolveFunnelSelection({
      events: "event.one,event.two",
      context: contextFor(mkdtempSync(join(tmpdir(), "posthog-profile-"))),
      parseEvents: (events) => events.split(","),
    });

    expect(selection).toEqual({
      source: "events",
      preset: null,
      events: ["event.one", "event.two"],
      requiresReconciliation: false,
    });
  });

  test("reads reconciliation metadata from presets", () => {
    const dir = mkdtempSync(join(tmpdir(), "posthog-profile-"));
    writeFileSync(
      join(dir, "posthog.funnels.json"),
      JSON.stringify({
        version: 1,
        funnels: {
          conversion: {
            requiresReconciliation: true,
            events: ["first", "second"],
          },
        },
      })
    );

    const selection = resolveFunnelSelection({
      preset: "conversion",
      context: contextFor(dir),
      parseEvents: (events) => events.split(","),
    });

    expect(selection).toEqual({
      source: "preset",
      preset: "conversion",
      events: ["first", "second"],
      requiresReconciliation: true,
    });
  });
});
