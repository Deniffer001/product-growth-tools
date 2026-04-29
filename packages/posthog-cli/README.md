# @deniffer/posthog-cli

Agent-friendly PostHog provider CLI for raw product analytics reads.

Requires Bun at runtime. The published bin delegates to `bun run`.

```bash
posthog --schema
posthog doctor dataset readiness
posthog profile validate
posthog query dataset results --query "SELECT event, count() FROM events GROUP BY event ORDER BY count() DESC LIMIT 20"
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

Profile funnel presets live in the active product-growth profile at `posthog.funnels.json`.

This CLI intentionally stays provider-only: it returns raw PostHog facts as JSON and leaves joins, reports, and growth decisions to the consuming repo or Growth OS layer.
