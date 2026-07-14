import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

type PackResult = {
  filename: string;
};

const packageRoot = resolve(import.meta.dir, "..");
const temporaryRoot = await mkdtemp(join(tmpdir(), "gkit-package-artifact-"));
const packDirectory = join(temporaryRoot, "pack");
const consumerDirectory = join(temporaryRoot, "consumer");

try {
  await Promise.all([
    mkdir(packDirectory, { recursive: true }),
    mkdir(consumerDirectory, { recursive: true }),
  ]);
  const packed = await runCommand(
    ["npm", "pack", "--json", "--pack-destination", packDirectory, packageRoot],
    temporaryRoot,
  );
  const packResults = JSON.parse(packed.stdout) as PackResult[];
  const filename = packResults[0]?.filename;
  if (!filename) throw new Error("npm pack did not report a package filename.");

  const tarballPath = join(packDirectory, filename);
  await writeFile(
    join(consumerDirectory, "package.json"),
    `${JSON.stringify({ name: "gkit-package-consumer", private: true }, null, 2)}\n`,
    "utf8",
  );
  await runCommand(["bun", "add", tarballPath], consumerDirectory);

  const installedPackageJson = await readFile(
    join(consumerDirectory, "node_modules", "gkit", "package.json"),
    "utf8",
  );
  if (installedPackageJson.includes('"catalog:"')) {
    throw new Error("The installed gkit artifact still contains workspace-only catalog ranges.");
  }

  const gkit = join(consumerDirectory, "node_modules", ".bin", "gkit");
  await runCommand([gkit, "--schema", "gsc"], consumerDirectory);
  const described = await runCommand(
    [gkit, "describe", "--id", "gsc.properties.list"],
    consumerDirectory,
  );
  const capability = JSON.parse(described.stdout) as { id?: unknown };
  if (capability.id !== "gsc.properties.list") {
    throw new Error("The installed gkit artifact returned an unexpected capability.");
  }

  process.stdout.write(`Verified installable gkit artifact: ${filename}\n`);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

async function runCommand(
  command: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string }> {
  const process = Bun.spawn(command, {
    cwd,
    env: { ...Bun.env, CI: "1" },
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  const [exitCode, stdout, stderr] = await Promise.all([
    process.exited,
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
  ]);
  if (exitCode !== 0) {
    throw new Error(
      `Command failed (${exitCode}): ${command.join(" ")}\n${stdout}${stderr}`.trimEnd(),
    );
  }
  return { stdout, stderr };
}
