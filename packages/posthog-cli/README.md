# @deniffer/posthog-cli

Agent-friendly PostHog provider CLI for raw product analytics reads.

Requires Bun at runtime. The published bin delegates to `bun run`.

```bash
posthog --schema
posthog doctor dataset readiness
posthog profile validate
posthog query dataset results --query "SELECT event, count() FROM events GROUP BY event ORDER BY count() DESC LIMIT 20"
posthog query action run --request ./request.json --out ./artifacts/posthog-query
posthog project dataset event-definitions
posthog project dataset property-definitions --type person
posthog event dataset counts --window 3d --limit 200
posthog event dataset map --window 3d --limit 500
posthog funnel analyze --window 3d --events event.one,event.two,event.three
posthog funnel analyze --window 3d --preset example_funnel
posthog audit dataset instrumentation --window 3d --preset example_funnel
posthog feature-flag dataset flags
posthog insight dataset insights --limit 20
posthog insight dataset insights --limit 5 --raw
posthog dashboard dataset dashboards --limit 20
```

Set credentials through the active product-growth profile or invocation env:

- `POSTHOG_API_TOKEN` or `POSTHOG_PERSONAL_API_KEY`
- `POSTHOG_HOST`
- `POSTHOG_PROJECT_ID`

Use `--from YYYY-MM-DD --to YYYY-MM-DD` instead of `--window` for calendar-range reads.

## Reproducible Query Artifacts

Use `query action run` when an upper-layer Growth OS needs a durable provider-read artifact instead of a one-off stdout result.

```json
{
  "schema_version": "provider_query_request.v1",
  "provider": "posthog",
  "operation": "query.dataset.results",
  "profile": "openclaw-web",
  "input": {
    "query": "SELECT event, count() FROM events GROUP BY event LIMIT 20",
    "noLimitGuard": true,
    "raw": true
  },
  "metadata": {
    "purpose": "activation-time-to-action"
  }
}
```

The output directory contains `request.json`, `command.json`, `stdout.txt`, `stderr.txt`, `raw-result.json`, `result.json`, and `manifest.json`. The manifest includes provider, profile, CLI version, status, artifact refs, `request_hash`, `query_hash`, and `result_hash`.

Do not put route, run, decision, finding, recommendation, or decision-rule fields in the request. Growth OS should attach the artifact directory to its own ledger.

Profile funnel presets live in the active product-growth profile at `posthog.funnels.json`.

This CLI intentionally stays provider-only: it returns raw PostHog facts as JSON and leaves joins, reports, and growth decisions to the consuming repo or Growth OS layer.
