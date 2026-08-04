# gkit

Profile-bound CLI for agent-first access to growth providers. This repository
has one CLI and one workspace package: `gkit`.

The reviewed provider surface includes DataForSEO, PostHog, Google Ads, Google
Search Console, and Bing Webmaster.

## Requirements

gkit runs on [Bun](https://bun.sh/). Confirm that Bun is available before
installing:

```bash
bun --version
```

gkit is distributed only as a public npm tarball attached to GitHub Releases.
It is not published to an npm registry, so the GitHub URL is required in every
install command.

## Install

Install the latest stable release globally:

```bash
bun add --global "gkit@https://github.com/celados/gkit/releases/latest/download/gkit.tgz"
gkit --schema gsc
```

If the install succeeds but `gkit` is not found, run `bun pm bin --global` and
make sure the printed directory is included in your `PATH`.

Install an exact version instead:

```bash
VERSION=0.1.1
bun add --global "gkit@https://github.com/celados/gkit/releases/download/v${VERSION}/gkit-${VERSION}.tgz"
```

Prereleases are available only through their exact version URLs and never
replace the stable `latest` download.

Because the stable URL does not change between releases, remove the installed
copy before upgrading so Bun cannot reuse an older cached resolution:

```bash
bun remove --global gkit
bun add --global "gkit@https://github.com/celados/gkit/releases/latest/download/gkit.tgz"
gkit --schema gsc
```

To uninstall:

```bash
bun remove --global gkit
```

## Quick start

### 1. Discover capabilities

Discovery commands are offline and do not load a profile or resolve secrets:

```bash
gkit --schema
gkit --schema gsc
gkit docs --provider gsc
gkit describe --id gsc.properties.list
```

Use `gkit --help` for the complete command shape. Use `describe` before calling
an operation: it returns the reviewed input schema, effects, examples, and
artifact behavior for that capability.

### 2. Configure an App profile

Provider execution must bind exactly one App profile. Create one JSON file at
`$XDG_CONFIG_HOME/gkit/profiles/<app>.json`, or at
`~/.config/gkit/profiles/<app>.json` when `XDG_CONFIG_HOME` is unset:

```json
{
  "version": 1,
  "name": "my-app",
  "providers": {
    "posthog": {
      "config": {
        "host": "https://us.posthog.com",
        "projectId": "12345"
      },
      "secrets": {
        "apiToken": "env:MY_APP_POSTHOG_TOKEN"
      }
    },
    "gsc": {
      "config": {
        "siteUrl": "sc-domain:example.com"
      },
      "secrets": {
        "serviceAccountFile": "env:MY_APP_GSC_SERVICE_ACCOUNT_FILE"
      }
    }
  }
}
```

Profiles contain non-secret provider defaults and `env:` references only. Keep
the referenced values in the team's secret manager and inject them into the
gkit process at runtime. Do not put plaintext credentials in the profile,
repository, Agent instructions, command arguments, or shell startup files.

For local use, gkit also loads an optional profile-adjacent environment file at
`~/.config/gkit/profiles/<app>/.env` after the profile is selected. Keep this
file outside the repository with mode `0600`; explicitly supplied process
environment values take precedence over values in the file.

Select a profile explicitly:

```bash
gkit --profile my-app posthog doctor
gkit --profile my-app gsc doctor
```

Or bind it for one process through the environment:

```bash
GKIT_PROFILE=my-app gkit posthog doctor
```

`--profile` takes precedence over `GKIT_PROFILE`. One invocation never merges
or falls back to another App profile. Compare multiple Apps by running separate
invocations and joining their outputs outside gkit.

### 3. Check the profile

Run `doctor` before making a provider request. It checks the selected profile
and its provider configuration without printing secret values:

```bash
gkit --profile my-app gsc doctor
```

### 4. Preview, then execute

Start with the exact example returned by `describe` and keep `--dry-run` while
reviewing the request:

```bash
gkit --profile my-app gsc api call \
  --operation-id gsc.properties.list \
  --input '{}' \
  --out ./gsc-properties-plan.json \
  --dry-run
```

Remove `--dry-run` only when the profile and request are correct:

```bash
gkit --profile my-app gsc api call \
  --operation-id gsc.properties.list \
  --input '{}' \
  --out ./gsc-properties.json
```

Artifacts use no-replace behavior by default. Choose a new output path for a
later run, or add `--force` only after reviewing the existing destination.
DataForSEO operations that can spend money additionally require both
`--allow-spend` and an explicit `--max-spend-usd` limit.

## Configure an Agent

Agents do not need provider-specific CLIs or their own copies of credentials.
A repository can add the following contract to its `AGENTS.md`:

```md
## Growth provider access

- Use `gkit` for all growth-provider access.
- The default App profile for this repository is `<app-name>`.
- Before a live request, run `gkit --profile <app-name> <provider> doctor`.
- Discover capabilities with `gkit --schema`,
  `gkit docs --provider <provider>`, and
  `gkit describe --id <capability-id>`.
- Never read, record, or print provider secrets.
```

The Agent only needs to know that it should use gkit and which App profile owns
the task. CLI installation and secret access belong to the machine or runtime.

All former standalone provider and local-tool packages were removed after the
sole CLI consumer explicitly selected a hard cutover. There are no compatibility
aliases or deprecated binaries. Historical behavior evidence remains under
[`packages/gkit/evals`](packages/gkit/evals).

## Verification

```bash
bun run eval
bun run check-types
bun run test
bun run verify:package
```
