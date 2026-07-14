---
type: Evaluation
title: gkit Slice 4 Bing Baseline
description: >
  Redacted generated-contract, request-planning, API-key redaction, live-read,
  legacy-comparison, error, artifact, profile, and ledger evidence for Bing
  Webmaster.
status: passed
version: 1.0
timestamp: 2026-07-14T13:53:13+08:00
resource: ./bing-migration-matrix.md
---

# gkit Slice 4 Bing Baseline

## Verdict

**PASS for the provider data surface.** The pinned JSON contract inventories
and exposes all 17 existing read methods. The real `openclaw-web` profile
passed all 17 live reads against `https://openclawai.io/`, the real invalid-key
negative, and same-input legacy comparisons.

## Generated and safety surface

- Fixed origin: `https://ssl.bing.com/webmaster/api.svc/json`.
- Authentication remains the provider-required `apikey` query parameter.
- Each request builder emits a real request URL and a separate key-free
  `diagnosticUrl`; only the latter enters dry-run data, failures, and success
  metadata.
- API-key plaintext and URL-encoded variants are absent from both successful
  and failed dispatch results. Provider-controlled error messages are not
  projected into the envelope.
- A real endpoint negative with a one-time invalid key reached `GetUserSites`.
  Bing returned HTTP `400` plus provider code `3`; dogfood exposed and fixed
  the required `AUTH_FAILED` mapping, with a key-free diagnostic URL.
- JSON-string query parameters preserve the legacy contract for query, page,
  URL, link, and feed inputs. All capabilities are `read`, `cost:null`, and
  artifact-backed.
- Generated artifacts are checksum-bound and byte-stable. Profile validation
  accepts only optional `siteUrl` plus an `apiKey` `env:` reference.

## Real and legacy comparison gate

The live run covered sites; rank, query, page, and focused query/page traffic;
crawl stats, issues, and settings; link counts and link detail; sitemap list
and detail; and URL index and traffic information. All 17 gkit calls and all
17 same-input legacy calls succeeded.

- Fifteen responses were byte-for-data identical after removing each CLI's
  envelope. The two query-list responses contained the same rows but Bing
  returned them in a different order across the separate requests.
- Representative live results included 5 accessible sites, 35 query rows, 28
  page rows, 6 crawl-stat rows, and one sitemap. Legitimate empty query-page
  and crawl-issue results remained successful empty arrays.
- The gkit run wrote 17 exact Bing JSON artifacts totaling 26,855 bytes. All
  parsed as JSON and had mode `0600`; the containing directory had mode
  `0700`.
- Combined gkit and legacy evidence comprised 34 JSON files totaling 66,632
  bytes. A scan of the evidence and repository found no API-key value.
- Every gkit envelope had `effects:["read"]`, `cost:null`, and
  `attemptId:null`. The spend ledger remained at eight attempts, zero
  unresolved outcomes, and zero policy breaches, with no Bing entries.

## Retirement decision

All 17 legacy provider-data commands are `replace`. The network-aware legacy
doctor remains `keep` because `gkit bing doctor` intentionally validates local
configuration only; therefore the old package is not deleted in this slice.
