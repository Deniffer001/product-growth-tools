import type { Envelope, EnvelopeMeta } from "./envelope";
import {
  GkitFailure,
  SecretRegistry,
  toFailureEnvelope,
} from "./envelope";
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
  provider: "dataforseo";
  environment: "production" | "sandbox";
  profileConfigured: true;
  secretsConfigured: true;
  spendPolicyConfigured: boolean;
  networkProbe: "unknown";
  note: string;
};

function doctorMeta(profile: string): EnvelopeMeta {
  return {
    profile,
    provider: "dataforseo",
    capability: null,
    effects: [],
    cost: null,
    artifact: null,
    attemptId: null,
    spendOutcome: null,
    providerRequestId: null,
  };
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
    secrets.registerBasicAuth(
      resolvedSecrets.login,
      resolvedSecrets.password,
    );
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
