# @deniffer/posthog-cli

Provider-only PostHog CLI for product-growth agents.

- Keep output JSON-first and schema-discoverable.
- Keep this package as a raw PostHog provider surface. Do not add reports, recommendations, or business conclusions here.
- `query action run` may write reproducible provider-read artifacts, but it must not accept Growth OS route/run/decision/finding fields or write ledgers.
- Prefer PostHog's official `@posthog/agent-toolkit` tool handlers before adding direct REST calls.
- Add direct REST only when the official toolkit does not expose the required read surface.
