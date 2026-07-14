# gkit

Private, profile-bound CLI for agent-first access to growth providers. This
repository has one CLI and one workspace package: `gkit`.

```bash
bun install
bun link --cwd packages/gkit
gkit --schema
gkit docs --provider gsc
gkit describe --id gsc.search-analytics.query
gkit --profile openclaw-web gsc doctor
```

The reviewed provider surface includes DataForSEO, PostHog, Google Ads, Google
Search Console, and Bing Webmaster. Profiles live under
`~/.config/gkit/profiles/<app>`; secrets are referenced from environment or
credential files and are never part of the manifest or output contract.

All former standalone provider and local-tool packages were removed after the
sole CLI consumer explicitly selected a hard cutover. There are no compatibility
aliases or deprecated binaries. Historical behavior evidence remains under
[`packages/gkit/evals`](packages/gkit/evals).

## Verification

```bash
bun run eval
bun run check-types
bun run test
```

gkit is private and is not published to npm.
