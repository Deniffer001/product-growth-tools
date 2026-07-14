---
type: Reference
title: DataForSEO reviewed executable capabilities
description: >
  Generated, searchable documentation for the reviewed DataForSEO operations
  that gkit is allowed to route and execute.
provider: dataforseo
manifestRevision: 2026-07-13.slice1.1
---

# DataForSEO reviewed executable capabilities

This file is byte-stably rendered from `generated/dataforseo/manifest.json`.
The committed manifest remains the only runtime, validation, effect, cost, and discovery source.

## dataforseo.backlinks.bulk_ranks.live

Return DataForSEO backlink ranks for up to 1,000 targets in one live request.

- Provider: `dataforseo`
- Adapter key: `backlinks.bulk_ranks.live`
- Capability revision: `1`
- Effects: `read`, `spend`
- Cost-policy revision: `dataforseo-backlinks-pricing-2026-07-01-v1`
- Conservative cost model: `24000` base micros + `36` micros per item at `/targets` (max `1000`)

### Input schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "targets"
  ],
  "properties": {
    "targets": {
      "type": "array",
      "description": "Domains, subdomains, or absolute URLs to rank.",
      "minItems": 1,
      "maxItems": 1000,
      "items": {
        "type": "string",
        "minLength": 1
      }
    },
    "rank_scale": {
      "type": "string",
      "enum": [
        "one_hundred",
        "one_thousand"
      ]
    },
    "tag": {
      "type": "string",
      "maxLength": 255
    }
  }
}
```

### Invocation

#### Safe preflight

```bash
gkit --profile app-a dataforseo api call --operation-id dataforseo.backlinks.bulk_ranks.live --input @req.json --allow-spend --max-spend-usd 0.05 --out ranks.json --dry-run
```

#### Live call after reviewing the dry-run

```bash
gkit --profile app-a dataforseo api call --operation-id dataforseo.backlinks.bulk_ranks.live --input @req.json --allow-spend --max-spend-usd 0.05 --out ranks.json
```
