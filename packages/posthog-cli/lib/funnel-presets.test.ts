/**
 * @input temporary product-growth profile artifacts
 * @output funnel preset validation coverage
 * @pos prevents project knowledge artifacts from silently drifting
 */

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { validateFunnelPresetFile } from "./funnel-presets";
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
          signup_to_paid: {
            description: "Signup to paid",
            requiresReconciliation: true,
            events: ["auth.signup", "purchase.completed"],
          },
        },
      })
    );

    const result = validateFunnelPresetFile(contextFor(dir));

    expect(result.ok).toBe(true);
    expect(result.version).toBe(1);
    expect(result.funnels).toEqual([
      {
        name: "signup_to_paid",
        description: "Signup to paid",
        eventCount: 2,
        requiresReconciliation: true,
      },
    ]);
  });

  test("rejects unversioned preset files", () => {
    const dir = mkdtempSync(join(tmpdir(), "posthog-profile-"));
    writeFileSync(
      join(dir, "posthog.funnels.json"),
      JSON.stringify({ funnels: { signup_to_paid: ["auth.signup"] } })
    );

    const result = validateFunnelPresetFile(contextFor(dir));

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Preset file must set version: 1.");
  });
});
