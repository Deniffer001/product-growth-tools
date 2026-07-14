import type { ParsedCommand } from "./args";
import { GkitFailure } from "./envelope";
import { executeReadProviderCall } from "./execute-read-provider";
import { readGscServiceAccount, resolveGscServiceAccountPath } from "./gsc-credentials";
import type { LoadedExecutableManifest } from "./manifest";
import type { ProviderProfile } from "./profile";
import { deriveGscAccessToken } from "./providers/gsc-auth";
import {
  dispatchGsc,
  planGscRequest,
  type GscConfig,
  type GscCredentials,
  type GscOperation,
} from "./providers/gsc";

type GscCallCommand = Extract<ParsedCommand, { kind: "gsc-call" }>;

export const gscAdapterKeys = new Set([
  "properties.list",
  "search-analytics.query",
  "sitemaps.list",
  "sitemaps.get",
  "url-inspection.inspect",
]);

export async function executeGscCall(options: {
  command: GscCallCommand;
  manifest: LoadedExecutableManifest;
  signal: AbortSignal;
  env?: Readonly<Record<string, string | undefined>>;
  xdgConfigHome?: string;
  home?: string;
}) {
  return await executeReadProviderCall<GscConfig, GscOperation, GscCredentials>({
    ...options,
    spec: {
      provider: "gsc",
      adapterKeys: gscAdapterKeys,
      readConfig,
      createOperation: (adapterKey, input) => Object.freeze({ adapterKey, input }),
      plan: planGscRequest,
      prepareCredentials: async ({ profile, resolvedSecrets, readFile, secrets }) => {
        const serviceAccountFile = resolvedSecrets.serviceAccountFile;
        if (!serviceAccountFile)
          throw new TypeError("GSC requires a serviceAccountFile env reference.");
        const path = resolveGscServiceAccountPath(profile, serviceAccountFile);
        const serviceAccount = await readGscServiceAccount(path, readFile);
        secrets.register(serviceAccount.privateKey);
        let accessToken: string;
        try {
          accessToken = await deriveGscAccessToken(serviceAccount.credentials);
        } catch {
          throw new GkitFailure({
            code: "AUTH_FAILED",
            message: "Google OAuth could not derive a GSC access token from the service account.",
            outcome: "not_dispatched",
          });
        }
        return {
          credentials: Object.freeze({ accessToken }),
          secretValues: [serviceAccount.privateKey, accessToken],
        };
      },
      dispatch: dispatchGsc,
      artifactFormat: "exact-gsc-json-response",
    },
  });
}

function readConfig(provider: ProviderProfile): GscConfig {
  const siteUrl = provider.config.siteUrl;
  return Object.freeze({ ...(typeof siteUrl === "string" ? { siteUrl } : {}) });
}
