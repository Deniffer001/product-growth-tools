---
type: Reference
title: PostHog legacy CLI migration matrix
description: >
  Command-level replace, keep, and drop decisions after the gkit Slice 3 live
  gate, used to prevent premature retirement of the legacy PostHog package.
status: superseded
version: 1.0
timestamp: 2026-07-14T11:16:00+08:00
resource: ../../../docs/plans/2026-07-13-gkit-vertical-slice-plan.md
---

# PostHog legacy CLI migration matrix

> Historical Slice 3 evidence. The final hard-cut decision in
> [`slice5-final-migration-matrix.md`](./slice5-final-migration-matrix.md)
> converts every `keep` row to `drop`; the package has been deleted.

## Decision rule

`replace` requires compatible input behavior, provider-native result
validation, safe artifact handling, and a live gate. `keep` means gkit does not
yet preserve the command's complete user-visible behavior. No command is
dropped in Slice 3.

## `@deniffer/posthog-cli`

| Legacy command                         | Decision | gkit target or missing gate                                                                                                      |
| -------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `doctor dataset readiness`             | keep     | gkit doctor validates local config only; it does not yet replace the legacy project/scope visibility probe                       |
| `query dataset results`                | replace  | `posthog.query.run`; bounded query, exact raw result, and live gate passed; legacy unbounded mode is intentionally not preserved |
| `query action run`                     | keep     | gkit writes one atomic raw artifact, not the legacy request/command/stdout/stderr/result/manifest directory bundle               |
| `project dataset event-definitions`    | keep     | no reviewed executable manifest record                                                                                           |
| `project dataset property-definitions` | keep     | no reviewed executable manifest record                                                                                           |
| `event dataset counts`                 | keep     | possible through hand-written HogQL, but the typed window/event behavior is not replaced                                         |
| `event dataset map`                    | keep     | possible through hand-written HogQL, but namespace grouping behavior is not replaced                                             |
| `funnel analyze`                       | keep     | no typed funnel planner, preset resolution, or behavior gate                                                                     |
| `audit dataset instrumentation`        | keep     | no instrumentation-support audit capability                                                                                      |
| `profile validate`                     | keep     | no validation of legacy non-secret funnel artifacts                                                                              |
| `feature-flag dataset flags`           | keep     | no reviewed executable manifest record                                                                                           |
| `insight dataset insights`             | keep     | no reviewed executable manifest record                                                                                           |
| `dashboard dataset dashboards`         | keep     | no reviewed executable manifest record                                                                                           |

## Package retirement verdict

The legacy PostHog package is not deleted. One command behavior is replaced and
twelve remain `keep`; retirement remains command-gated rather than package-name
gated.
