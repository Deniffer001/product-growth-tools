import { readFile } from "node:fs/promises";

import type { Envelope, EnvelopeMeta } from "./envelope";
import { GkitFailure, SecretRegistry, toFailureEnvelope } from "./envelope";
import {
  readGoogleAdsServiceAccount,
  resolveGoogleAdsServiceAccountPath,
} from "./google-ads-credentials";
import { readGscServiceAccount, resolveGscServiceAccountPath } from "./gsc-credentials";
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
  provider: "bing" | "dataforseo" | "google-ads" | "gsc" | "posthog";
  environment: "production" | "sandbox" | null;
  host?: string;
  projectId?: string;
  customerId?: string;
  siteUrl?: string;
  authMode?: "service_account";
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

export async function runBingDoctor(options: {
  profileFlag: string | null;
  env?: Readonly<Record<string, string | undefined>>;
  xdgConfigHome?: string;
  home?: string;
}): Promise<DoctorExecutionResult> {
  return await runSimpleReadDoctor({ ...options, provider: "bing", secretName: "apiKey" });
}

export async function runGscDoctor(options: {
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
    const provider = getProviderProfile(profile, "gsc");
    const resolved = resolveProviderSecrets(profile, "gsc", env);
    const serviceAccountFile = resolved.serviceAccountFile;
    if (!serviceAccountFile) {
      throw new ProfileError("invalid_profile", "GSC requires a serviceAccountFile env reference.");
    }
    const credentialsPath = resolveGscServiceAccountPath(profile, serviceAccountFile);
    const serviceAccount = await readGscServiceAccount(credentialsPath, readFile);
    secrets.register(serviceAccount.privateKey);
    return {
      envelope: {
        ok: true,
        data: {
          profilePath: profile.path,
          provider: "gsc",
          environment: null,
          ...(typeof provider.config.siteUrl === "string"
            ? { siteUrl: provider.config.siteUrl }
            : {}),
          authMode: "service_account",
          profileConfigured: true,
          secretsConfigured: true,
          spendPolicyConfigured: false,
          networkProbe: "unknown",
          note: "GSC readiness validates local service-account configuration only; no OAuth or provider network request was sent.",
        },
        meta: doctorMeta(profile.name, "gsc"),
      },
      secrets,
    };
  } catch (error) {
    return doctorProfileFailure(error, selectedProfile, "gsc", secrets);
  }
}

async function runSimpleReadDoctor(options: {
  profileFlag: string | null;
  provider: "bing";
  secretName: "apiKey";
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
    const provider = getProviderProfile(profile, options.provider);
    const resolved = resolveProviderSecrets(profile, options.provider, env);
    const secret = resolved[options.secretName];
    if (!secret)
      throw new ProfileError("invalid_profile", "Bing requires an apiKey env reference.");
    secrets.register(secret);
    return {
      envelope: {
        ok: true,
        data: {
          profilePath: profile.path,
          provider: options.provider,
          environment: null,
          ...(typeof provider.config.siteUrl === "string"
            ? { siteUrl: provider.config.siteUrl }
            : {}),
          profileConfigured: true,
          secretsConfigured: true,
          spendPolicyConfigured: false,
          networkProbe: "unknown",
          note: "Bing readiness validates local API-key configuration only; no provider network request was sent.",
        },
        meta: doctorMeta(profile.name, options.provider),
      },
      secrets,
    };
  } catch (error) {
    return doctorProfileFailure(error, selectedProfile, options.provider, secrets);
  }
}

function doctorProfileFailure(
  error: unknown,
  selectedProfile: string | null,
  provider: "bing" | "gsc",
  secrets: SecretRegistry,
): DoctorExecutionResult {
  if (!(error instanceof ProfileError)) throw error;
  return {
    envelope: toFailureEnvelope(
      new GkitFailure({
        code: "PROFILE_ERROR",
        message: error.message,
        hint: "Fix the selected profile, credential file, or referenced environment variables.",
        meta: selectedProfile ? doctorMeta(selectedProfile, provider) : undefined,
      }),
    ),
    secrets,
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

export async function runGoogleAdsDoctor(options: {
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
    const provider = getProviderProfile(profile, "google-ads");
    const resolvedSecrets = resolveProviderSecrets(profile, "google-ads", env);
    const developerToken = resolvedSecrets.developerToken;
    const serviceAccountFile = resolvedSecrets.serviceAccountFile;
    if (!developerToken || !serviceAccountFile) {
      throw new ProfileError(
        "invalid_profile",
        "Google Ads requires developerToken and serviceAccountFile env references.",
      );
    }
    secrets.register(developerToken);
    const credentialsPath = resolveGoogleAdsServiceAccountPath(profile, serviceAccountFile);
    const serviceAccount = await readGoogleAdsServiceAccount(credentialsPath, readFile);
    secrets.register(serviceAccount.privateKey);

    return {
      envelope: {
        ok: true,
        data: {
          profilePath: profile.path,
          provider: "google-ads",
          environment: null,
          customerId: String(provider.config.customerId),
          authMode: "service_account",
          profileConfigured: true,
          secretsConfigured: true,
          spendPolicyConfigured: false,
          networkProbe: "unknown",
          note: "Google Ads readiness validates the local single-account service-account profile only; no OAuth or provider network request was sent.",
        },
        meta: doctorMeta(profile.name, "google-ads"),
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
            hint: "Fix the selected profile, service-account file, or referenced environment variables.",
            meta: selectedProfile ? doctorMeta(selectedProfile, "google-ads") : undefined,
          }),
        ),
        secrets,
      };
    }
    throw error;
  }
}

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
