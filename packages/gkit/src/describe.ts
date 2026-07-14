import { GkitFailure } from "./envelope";
import {
  getManifestRecord,
  ManifestError,
  type LoadedExecutableManifest,
} from "./manifest";

export function describeCapability(
  manifest: LoadedExecutableManifest,
  capabilityId: string,
): string {
  try {
    const record = getManifestRecord(manifest, capabilityId);
    return `${JSON.stringify(record, null, 2)}\n`;
  } catch (error) {
    if (error instanceof ManifestError && error.kind === "CAPABILITY_NOT_FOUND") {
      throw new GkitFailure({
        code: "CAPABILITY_NOT_FOUND",
        message: `Capability ${capabilityId} is not present in the executable manifest.`,
        hint: "Run gkit --schema, then describe an exposed capability ID.",
      });
    }
    throw error;
  }
}
