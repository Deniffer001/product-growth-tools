import type { Envelope, EnvelopeMeta } from "./envelope";
import { GkitFailure, SecretRegistry, toFailureEnvelope } from "./envelope";
import {
  getProviderEnvironment,
  getProviderProfile,
  loadProfile,
  ProfileError,
  resolveProviderSecrets,
  selectProfileName,
} from "./profile";

export type DoctorResult = {
  profilePath: string;
  provider: "dataforseo" | "posthog";
  environment: "production" | "sandbox" | null;
  host?: string;
  projectId?: string;
  profileConfigured: true;
  secretsConfigured: true;
  spendPolicyConfigured: boolean;
  networkProbe: "unknown";
  note: string;
};

function doctorMeta(profile: string, provider = "dataforseo"): EnvelopeMeta {
  return {
    profile,
    provider,
    capability: null,
    effects: [],
    cost: null,
    artifact: null,
    attemptId: null,
    spendOutcome: null,
    providerRequestId: null,
  };
}

export async function runPostHogDoctor(options: {
  profileFlag: string | null;
  env?: Readonly<Record<string, string | undefined>>;
  xdgConfigHome?: string;
  home?: string;
}): Promise<DoctorExecutionResult> {
  const env = options.env ?? process.env;
  const secrets = new SecretRegistry();
  let selectedProfile = options.profileFlag ?? env.GKIT_PROFILE ?? null;

  try {
    selectedProfile = selectProfileName(options.profileFlag ?? undefined, env);
    const profile = await loadProfile(selectedProfile, {
      xdgConfigHome: options.xdgConfigHome,
      home: options.home,
    });
    const provider = getProviderProfile(profile, "posthog");
    for (const reference of Object.values(provider.secrets)) {
      const value = env[reference.slice("env:".length)];
      if (value) secrets.register(value);
    }
    const resolvedSecrets = resolveProviderSecrets(profile, "posthog", env);
    if (!resolvedSecrets.apiToken) {
      throw new ProfileError(
        "invalid_profile",
        "PostHog requires an apiToken env reference under secrets.",
      );
    }

    return {
      envelope: {
        ok: true,
        data: {
          profilePath: profile.path,
          provider: "posthog",
          environment: null,
          host: String(provider.config.host),
          projectId: String(provider.config.projectId),
          profileConfigured: true,
          secretsConfigured: true,
          spendPolicyConfigured: false,
          networkProbe: "unknown",
          note: "PostHog readiness validates local configuration only; no network request was sent.",
        },
        meta: doctorMeta(profile.name, "posthog"),
      },
      secrets,
    };
  } catch (error) {
    if (error instanceof ProfileError) {
      return {
        envelope: toFailureEnvelope(
          new GkitFailure({
            code: "PROFILE_ERROR",
            message: error.message,
            hint: "Fix the selected profile or inject its referenced secret environment variables.",
            meta: selectedProfile ? doctorMeta(selectedProfile, "posthog") : undefined,
          }),
        ),
        secrets,
      };
    }
    throw error;
  }
}

export type DoctorExecutionResult = {
  envelope: Envelope<DoctorResult>;
  secrets: SecretRegistry;
};

export async function runDataForSeoDoctor(options: {
  profileFlag: string | null;
  env?: Readonly<Record<string, string | undefined>>;
  xdgConfigHome?: string;
  home?: string;
}): Promise<DoctorExecutionResult> {
  const env = options.env ?? process.env;
  const secrets = new SecretRegistry();
  let selectedProfile = options.profileFlag ?? env.GKIT_PROFILE ?? null;

  try {
    selectedProfile = selectProfileName(options.profileFlag ?? undefined, env);
    const profile = await loadProfile(selectedProfile, {
      xdgConfigHome: options.xdgConfigHome,
      home: options.home,
    });
    const provider = getProviderProfile(profile, "dataforseo");
    for (const reference of Object.values(provider.secrets)) {
      const value = env[reference.slice("env:".length)];
      if (value) secrets.register(value);
    }
    const resolvedSecrets = resolveProviderSecrets(profile, "dataforseo", env);
    if (!resolvedSecrets.login || !resolvedSecrets.password) {
      throw new ProfileError(
        "invalid_profile",
        "DataForSEO requires login and password env references under secrets.",
      );
    }
    secrets.registerBasicAuth(resolvedSecrets.login, resolvedSecrets.password);
    if (typeof provider.policy.maxSpendUsdPerCall !== "string") {
      throw new ProfileError(
        "invalid_profile",
        "DataForSEO execution requires policy.maxSpendUsdPerCall in the selected profile.",
      );
    }

    return {
      envelope: {
        ok: true,
        data: {
          profilePath: profile.path,
          provider: "dataforseo",
          environment: getProviderEnvironment(profile, "dataforseo"),
          profileConfigured: true,
          secretsConfigured: true,
          spendPolicyConfigured: true,
          networkProbe: "unknown",
          note: "No safe, no-side-effect DataForSEO credential probe is available; no network request was sent.",
        },
        meta: doctorMeta(profile.name),
      },
      secrets,
    };
  } catch (error) {
    if (error instanceof ProfileError) {
      return {
        envelope: toFailureEnvelope(
          new GkitFailure({
            code: "PROFILE_ERROR",
            message: error.message,
            hint: "Fix the selected profile or inject its referenced secret environment variables.",
            meta: selectedProfile ? doctorMeta(selectedProfile) : undefined,
          }),
        ),
        secrets,
      };
    }
    throw error;
  }
}
