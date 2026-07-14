import { GoogleAuth, type JWTInput } from "google-auth-library";

const gscScope = "https://www.googleapis.com/auth/webmasters.readonly";

export async function deriveGscAccessToken(credentials: JWTInput): Promise<string> {
  const auth = new GoogleAuth({ credentials, scopes: [gscScope] });
  const client = await auth.getClient();
  const tokenResult = await client.getAccessToken();
  const accessToken = typeof tokenResult === "string" ? tokenResult : (tokenResult?.token ?? null);
  if (!accessToken) throw new Error("Google OAuth did not return an access token.");
  return accessToken;
}
