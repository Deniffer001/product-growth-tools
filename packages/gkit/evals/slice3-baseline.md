---
type: Evaluation
title: gkit Slice 3 PostHog Baseline
description: >
  Redacted generator, contract, negative, dry-run, live-query, artifact, and
  ledger-isolation evidence for the first reviewed PostHog capability.
status: passed
version: 1.0
timestamp: 2026-07-14T11:16:00+08:00
resource: ./tasks.jsonl
---

# gkit Slice 3 PostHog Baseline

## Verdict

**PASS.** `posthog.query.run` is discoverable from the shared gkit surface and
completed one bounded live HogQL read against the `clonesite.ai` profile. The
capability has only the `read` effect, produced one atomic raw artifact, and did
not create or modify a spend-ledger attempt.

The old PostHog package remains installed because only its bounded query-result
behavior is replaced. Its project, event, funnel, audit, profile, feature-flag,
insight, dashboard, richer doctor, and reproducible directory-bundle behaviors
remain outside this slice.

## Generated surface

- Pinned schema URL: `https://us.posthog.com/api/schema/`.
- Pinned SHA-256:
  `dd354156ab2bea0069cfa5eafa1992318f9fec4777dae273c86c9eedc8a4ada2`.
- Inventory: 2,516 OpenAPI operations, one executable, 2,515 inventory-only.
- Executable capability: `posthog.query.run` using
  `POST /api/projects/{project_id}/query/`.
- `generate:posthog:check` passed with byte-identical manifest, inventory, and
  docs output.

## Live gate

The query counted events from the preceding day, ordered them by count, and
requested at most ten rows. It returned ten rows and two columns.

- Artifact: 2,838 bytes.
- Artifact SHA-256:
  `56c435330956dd71b11a65edb2bc679b0ea78081a1625b2034e630296e4506fc`.
- Artifact path is local-only under `~/.local/state/gkit/dogfood/`.
- The injected API token was not present in the artifact.
- Provider request ID was absent from the response headers and remains `null`.

## Safety gates

- `doctor` validated the profile section, fixed US origin, project ID, and
  token reference without a network probe; `networkProbe` remained `unknown`.
- Dry-run resolved no secret, created no artifact, and returned the exact fixed
  endpoint, row limit, and input hash.
- Queries containing an embedded `LIMIT`, a write statement, or a comment were
  rejected as `INVALID_INPUT / not_dispatched` and created no artifact.
- A missing profile failed as `PROFILE_ERROR / not_dispatched`.
- The spend ledger was unchanged at eight attempts, zero unresolved outcomes,
  and zero recorded or active policy breaches before and after the live read.

## Abstraction decision

No `src/core/provider.ts` was created. The stable shared public seam is already
the manifest, profile, envelope, discovery, and artifact contracts. The two
execution paths still differ materially: DataForSEO requires Basic auth,
cost-model evaluation, spend authorization, durable settlement, and unknown
spend recovery; PostHog requires Bearer auth and a read-only HogQL bound without
a spend ledger. Extracting a provider interface now would preserve these
branches instead of deleting them.

## Verification

- PostHog generator RED/green contract, profile validation, transport mapping,
  artifact isolation, CLI discovery, dry-run, and live-shaped process tests
  passed.
- Both generated-provider `--check` commands passed.
- gkit package: 14 test files and 103 tests passed.
- Full workspace regression: 58 test files and 243 tests passed; all ten
  workspace package typechecks passed, and frozen install reported no changes.
