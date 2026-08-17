// Runtime read, not a Bun macro: gkit ships as a source tarball installed
// into node_modules, and Bun refuses to run macros from there.
export async function embedSkill(): Promise<Record<string, string>> {
  const text = await Bun.file(new URL("./SKILL.md", import.meta.url)).text();
  return { "SKILL.md": text };
}
