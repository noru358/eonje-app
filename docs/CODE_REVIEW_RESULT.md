# 언제(eonje-app) — Adversarial Review Result

Reviewed: 2026-08-29 KST  
Target: `feat/live-data-v0.6` at `d1f0a77`  
Review basis: repository code and tests, `CODE_REVIEW_BRIEF.md`, latest branch CI, and official Seoul/KMA API documentation.

## Executive verdict

**Not ready to merge to `main` until the patched branch passes CI and six-park live QC.**

The review found multiple silent missing-data paths capable of turning absent weather, air-quality, or crowd fields into apparently favorable observations. The accompanying v0.6.2 patch removes those coercions, adds explicit uncertainty, and adds regression coverage. No known P0 remains after the patch, but live API keys were unavailable in the review runtime, so the six-park real-payload gate is still open.

## Findings

| Severity | File / function | Concrete failure | Why tests missed it | Smallest robust fix | Status |
|---|---|---|---|---|---|
| P0 | `src/seoul-adapter.mjs` / `parseNum`, `normalizeCrowd`, `normalizeSeoulCityData` | Missing/non-numeric forecast rain, PM, wind, temperature, UV, or crowd became `0`, benign defaults, or `보통`, making unknown conditions look safe and complete. | Fixtures populated every field and asserted only happy-path values. | Preserve absent/unparseable values as `null`; only normalize explicitly recognized crowd labels. | Fixed + regressions |
| P0 | `src/kma-adapter.mjs` / `normalizeKmaForecast`, `mergeKmaIntoSlots` | A KMA row with TMP but missing POP/PCP became 0%/0 mm and overwrote valid Seoul rain data. | The KMA fixture always contained all four categories. | Parse each category independently; merge only finite fields; mark partial merges as mixed provenance. | Fixed + regression |
| P0 | `src/engine.mjs`, `src/verdict-sanitizer.mjs` | Missing rain could still produce “비 걱정이 적음”, display 0%, and retain `높음` confidence. | Existing sanitizer covered only crowd and wind. | Require known rain input for rain claims; give unknown inputs neutral scores; cap confidence for missing temp/rain. | Fixed + regression |
| P1 | `src/seoul-adapter.mjs` / `normalizeSeoulCityData` | Upstream observation time was reused as decision “now”; delayed data could re-include elapsed hours or distort wait times around boundaries. | Fixtures used observation time as query time. | Keep `updatedAt` as source time and set `nowTime` from actual decision time. | Fixed + regression |
| P1 | `src/data-quality.mjs`, `public/app.js` | Stale or future-dated LIVE data was still visually labeled “실시간”; future timestamps were clamped to age zero. | Web contract checked only LIVE vs DEMO. | Distinguish fresh/stale/unknown in UI and confidence; reject timestamps over five minutes in the future as unknown. | Fixed + regressions |
| P1 | `src/product-verdict.mjs`, `server.mjs` | An empty remaining horizon could throw from `makeVerdict`, leaving an API request as an internal failure instead of a `done` verdict. Async request errors had no response guard. | Tests called `makeVerdict` directly with past slots, not the product horizon wrapper/server path. | Return `done` for an empty horizon and wrap request handling in a JSON 500 guard. | Fixed + regression |
| P1 | `src/product-verdict.mjs` / `compressPrimaryWindow` | Compression could discard `지금` and `오늘 밤` semantics even when the selected window crossed midnight. | Tests asserted best time but not compressed public copy. | Recompute public label/subhead against actual now after compression. | Fixed + regression |
| P1 | `server.mjs` / `fetchReal` | Snapshot write failure occurred after caching LIVE but threw into DEMO fallback for the first request; the next request could return cached LIVE for identical data. | Snapshot failure was not injected. | Make snapshot persistence best-effort and keep the live response consistent. | Fixed; integration injection still desirable |
| P1 | `server.mjs` / `handleApi` | Unknown `place` silently returned Yeouido, enabling a materially wrong park recommendation for a typo/API caller. | Browser client validates place IDs before calling the API. | Return HTTP 400 `invalid_place`. | Fixed + smoke test |
| P1 | `src/seoul-adapter.mjs` / forecast construction | Slicing before sorting trusted upstream order; an out-of-order or expanded response could select the wrong 24 rows. Invalid ISO-like strings survived as truthy slot times. | Fixtures were chronological and date-valid. | Validate timestamps, then sort and truncate. | Fixed + regressions |
| P1 | `server.mjs` / `listenWithFallback` | After `EADDRINUSE`, a stale listening callback logged both the occupied port and the real fallback port, directing the user to the wrong URL. | No two-process smoke test. | Remove the failed attempt's listening handler before retrying. | Fixed + two-server smoke test |
| P2 | `src/seoul-xml.mjs` / `parseXml` | Mismatched closing tags were accepted and silently reshaped into the wrong object tree. | Tests covered only valid XML and an API error envelope. | Verify each closing tag against the open node. | Fixed + regression |
| P2 | `server.mjs` / `fetchReal` | Concurrent cache misses can stampede Seoul/KMA and duplicate snapshot work. | Unit tests do not exercise concurrent network requests. | Add one in-flight promise per place. | Open; not a merge blocker at current traffic |
| P2 | freshness model | One composite `updatedAt` cannot distinguish population, weather, KMA base, and AQ freshness. | Current data contract has one timestamp. | Track source-specific `observedAt`/`issuedAt` and calculate dimension-level freshness. | Open; calibration/data-model work |
| P2 | KMA fetch | The latest base is selected with a 15-minute lag but no retry of the previous base when the newest publication is late. | Publication-time unit test does not simulate delayed availability. | On a valid no-data response, retry exactly one previous release and expose selected base metadata. | Open; current failure remains explicit and Seoul fallback is used |

## Regression coverage added

1. Missing/non-numeric Seoul fields remain `null`, including unknown crowd and air quality.
2. Partial KMA rows preserve existing Seoul rain values and carry mixed provenance.
3. Missing rain cannot produce dry-weather copy or `높음` confidence.
4. Future/stale timestamps, empty horizons, and compressed cross-midnight copy remain honest.
5. Out-of-order forecasts, invalid timestamps, mismatched XML tags, and unknown-crowd alternative copy fail safely.

The suite increased from 28 to 41 passing tests. Port fallback and invalid-place behavior were also smoke-tested against a running server.

## Assumptions requiring empirical validation

- Weather/crowd/experience weights (`46/34/20`).
- Temperature, rain, AQ, and wind hard-gate thresholds.
- Neutral priors for unknown temperature/rain/wind/crowd.
- Primary-window tolerances and maximum two-hour public window.
- The 20-minute stale threshold and 90-minute limit for current-AQ reason copy.
- Whether current poor AQ should gate the entire future horizon or only near-term slots.
- Dawn/night preference adjustments and intent-specific behavior.

## Risk-ordered next patch plan

1. Run `npm run qc:live` with both API keys and inspect all six parks' completeness, horizons, provenance, KST end, reasons, and confidence.
2. Save scrubbed real response fixtures for all six parks and add replay tests.
3. Add source-specific timestamps and KMA base metadata; retry one prior KMA release on delayed publication.
4. Add in-flight request deduplication and snapshot-write failure injection.
5. Build snapshot/replay evaluation and calibrate gates/weights before UI polish or merge to `main`.
