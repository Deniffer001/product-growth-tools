import { describe, expect, test } from "vitest";
import {
  ProfileError,
  getProviderEnvironment,
  loadProfile,
  profilePath,
  resolveProviderSecrets,
  selectProfileName,
} from "./profile";

function profileDocument(
  config: Record<string, unknown> = {},
  secrets: Record<string, string> = {
    login: "env:APP_A_DATAFORSEO_LOGIN",
    password: "env:APP_A_DATAFORSEO_PASSWORD",
  },
) {
  return {
    version: 1,
    name: "app-a",
    providers: {
      dataforseo: {
        config,
        policy: {
          maxSpendUsdPerCall: "0.050000",
        },
        secrets,
      },
    },
  };
}

async function loadDocument(input: unknown) {
  return loadProfile("app-a", {
    xdgConfigHome: "/tmp/gkit-profile-test",
    readTextFile: async () => JSON.stringify(input),
  });
}

describe("profile selection", () => {
  test("requires a profile and gives the flag priority over GKIT_PROFILE", () => {
    expect(selectProfileName("flag-app", { GKIT_PROFILE: "env-app" })).toBe("flag-app");
    expect(selectProfileName(undefined, { GKIT_PROFILE: "env-app" })).toBe("env-app");
    expect(() => selectProfileName(undefined, {})).toThrow(
      expect.objectContaining({ reason: "missing_selector" }),
    );
  });

  test("rejects path traversal and non-slug selectors", () => {
    for (const name of ["../app-a", "app_a", "App-A", "-app"]) {
      expect(() => selectProfileName(name, {})).toThrow(
        expect.objectContaining({ reason: "invalid_slug" }),
      );
    }
  });

  test("accepts domain-style App profile names", () => {
    expect(selectProfileName("clonesite.ai", {})).toBe("clonesite.ai");
    expect(profilePath("clonesite.ai", { xdgConfigHome: "/tmp/config" })).toBe(
      "/tmp/config/gkit/profiles/clonesite.ai.json",
    );
  });

  test("uses the XDG config path without accepting a path-like profile name", () => {
    expect(profilePath("app-a", { xdgConfigHome: "/xdg", home: "/ignored" })).toBe(
      "/xdg/gkit/profiles/app-a.json",
    );
    expect(profilePath("app-a", { xdgConfigHome: "", home: "/home/app" })).toBe(
      "/home/app/.config/gkit/profiles/app-a.json",
    );
    expect(() => profilePath("app-a", { xdgConfigHome: "relative" })).toThrow(
      expect.objectContaining({ reason: "invalid_profile" }),
    );
  });
});

describe("profile loading and secret resolution", () => {
  test("defaults DataForSEO to the fixed production environment", async () => {
    const profile = await loadDocument(profileDocument());

    expect(getProviderEnvironment(profile, "dataforseo")).toBe("production");
    expect(profile.providers.dataforseo?.config).toEqual({
      environment: "production",
    });
    expect(Object.isFrozen(profile.providers.dataforseo?.config)).toBe(true);
  });

  test("accepts the fixed sandbox environment and rejects transport overrides", async () => {
    const sandbox = await loadDocument(profileDocument({ environment: "sandbox" }));
    expect(getProviderEnvironment(sandbox, "dataforseo")).toBe("sandbox");

    await expect(
      loadDocument(
        profileDocument({
          environment: "production",
          baseUrl: "https://attacker.invalid",
        }),
      ),
    ).rejects.toMatchObject({ reason: "invalid_profile" });
  });

  test("rejects filename/name mismatches", async () => {
    const input = profileDocument();
    input.name = "app-b";

    await expect(loadDocument(input)).rejects.toMatchObject({
      reason: "name_mismatch",
    });
  });

  test("rejects plaintext secret values and secret-looking config fields", async () => {
    await expect(
      loadDocument(profileDocument({}, { password: "plain-text" })),
    ).rejects.toMatchObject({ reason: "invalid_profile" });

    await expect(loadDocument(profileDocument({ password: "plain-text" }))).rejects.toMatchObject({
      reason: "invalid_profile",
    });
  });

  test("requires exactly the DataForSEO credential references", async () => {
    await expect(
      loadDocument(profileDocument({}, { login: "env:APP_A_DATAFORSEO_LOGIN" })),
    ).rejects.toMatchObject({ reason: "invalid_profile" });

    await expect(
      loadDocument(
        profileDocument(
          {},
          {
            login: "env:APP_A_DATAFORSEO_LOGIN",
            password: "env:APP_A_DATAFORSEO_PASSWORD",
            token: "env:APP_A_DATAFORSEO_TOKEN",
          },
        ),
      ),
    ).rejects.toMatchObject({ reason: "invalid_profile" });
  });

  test("resolves only the selected provider's env references after loading", async () => {
    const input = profileDocument();
    input.providers = {
      ...input.providers,
      posthog: {
        config: { host: "https://us.posthog.com", projectId: "12345" },
        policy: {},
        secrets: { apiToken: "env:APP_A_POSTHOG_TOKEN" },
      },
    } as typeof input.providers;
    const profile = await loadDocument(input);

    const resolved = resolveProviderSecrets(profile, "dataforseo", {
      APP_A_DATAFORSEO_LOGIN: "login",
      APP_A_DATAFORSEO_PASSWORD: "password",
    });
    expect(resolved).toEqual({ login: "login", password: "password" });
    expect(Object.isFrozen(resolved)).toBe(true);
  });

  test("accepts only the fixed PostHog origins, numeric project id, and api token reference", async () => {
    const input = profileDocument();
    input.providers = {
      ...input.providers,
      posthog: {
        config: { host: "https://eu.posthog.com", projectId: "12345" },
        policy: {},
        secrets: { apiToken: "env:APP_A_POSTHOG_TOKEN" },
      },
    } as typeof input.providers;

    const profile = await loadDocument(input);
    expect(profile.providers.posthog?.config).toEqual({
      host: "https://eu.posthog.com",
      projectId: "12345",
    });
    expect(resolveProviderSecrets(profile, "posthog", { APP_A_POSTHOG_TOKEN: "phx_test" })).toEqual(
      {
        apiToken: "phx_test",
      },
    );

    for (const posthog of [
      {
        config: { host: "https://attacker.invalid", projectId: "12345" },
        policy: {},
        secrets: { apiToken: "env:APP_A_POSTHOG_TOKEN" },
      },
      {
        config: { host: "https://us.posthog.com", projectId: "not-numeric" },
        policy: {},
        secrets: { apiToken: "env:APP_A_POSTHOG_TOKEN" },
      },
      {
        config: { host: "https://us.posthog.com", projectId: "12345" },
        policy: {},
        secrets: {
          apiToken: "env:APP_A_POSTHOG_TOKEN",
          extra: "env:APP_A_POSTHOG_EXTRA",
        },
      },
    ]) {
      const invalid = profileDocument();
      invalid.providers = { ...invalid.providers, posthog } as typeof invalid.providers;
      await expect(loadDocument(invalid)).rejects.toMatchObject({ reason: "invalid_profile" });
    }
  });

  test("reports a missing referenced env var without reading arbitrary secrets", async () => {
    const profile = await loadDocument(profileDocument());

    expect(() =>
      resolveProviderSecrets(profile, "dataforseo", {
        APP_A_DATAFORSEO_LOGIN: "login",
      }),
    ).toThrow(
      expect.objectContaining({
        reason: "secret_env_missing",
        message: expect.stringContaining("APP_A_DATAFORSEO_PASSWORD"),
      }),
    );
  });

  test("uses stable errors for missing providers", async () => {
    const profile = await loadDocument(profileDocument());

    expect(() => resolveProviderSecrets(profile, "posthog", {})).toThrow(ProfileError);
    expect(() => resolveProviderSecrets(profile, "posthog", {})).toThrow(
      expect.objectContaining({ reason: "provider_missing" }),
    );
  });
});
