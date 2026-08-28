# 언제(eonje-app) — Current Project Status

Updated: 2026-08-29 KST

## Current branch

`feat/live-data-v0.6`

This branch, not `main`, is the current development source of truth until live-data validation and review are complete.

## Product job

Current v0 question: **“오늘 한강 언제 가지?”**

Current parks: Yeouido, Banpo, Ttukseom, Mangwon, Jamsil, Ichon.

First-screen goal: one decisive recommendation window, up to 3 supported reasons, optional meaningful alternative, progressive disclosure for evidence. No fake precision and no unsupported claims.

## Live integrations confirmed

- Seoul Real-Time City Data: LIVE connection confirmed via XML endpoint.
- KMA short-term forecast: LIVE connection confirmed and merging temperature/rain/precipitation/wind.
- Freshness metadata working.
- Demo fallback remains explicit.

## Most recent Yeouido real-data case

Around 03:30 KST on 2026-08-29:
- Seoul + KMA both live
- 19:00 ≈ 86.7
- 20:00 ≈ 87.0
- 21:00 ≈ 83.8
- Product verdict compressed broad good period to `19:00–21:00`
- Recommended-slot crowd forecast was unavailable, so confidence should be capped at `보통`

## Important product semantics already decided

- Dawn/night is not a hard gate.
- Query before 06:00 still compares the coming daytime/evening.
- Evening queries may include next-day 00:00–05:59 as “tonight”.
- Unknown data is not a positive/negative observation.
- Current AQ can act as safety context/gate but must not be claimed as future AQ.
- Server verdict is the single decision source.
- Recommendation windows should avoid fake precision.
- Alternatives only appear for a meaningful, supported tradeoff.

## Recent bugs fixed / guarded

- Seoul `citydata` must use XML, not JSON endpoint.
- Seoul 24h forecast was accidentally truncated to 12 slots.
- Current wind/crowd must not be copied into future slots.
- KMA merge now updates provenance.
- `crowd=null` must not create “quieter” claims or crowd alternatives.
- Missing important forecast inputs cap confidence.
- Broad recommendation windows are compressed around the peak.
- Public verdict end time is normalized to KST rather than mixing `Z` and `+09:00`.
- Window-level reasons may include sunset when sunset lies inside the recommended window even if the single best slot is later.
- Server auto-tries the next port when 4173 is occupied.

## Current validation status

GitHub Actions runs tests on macOS / Windows / Linux. The latest small confidence-sanitizer fix was pushed after a regression test correctly caught that missing wind could still retain `높음` confidence. Check the latest branch CI before merge.

## Immediate next steps

1. Pull latest `feat/live-data-v0.6` and run `npm test`.
2. Confirm latest Yeouido verdict fields: `windowLabel`, `reasons`, `confidenceDetail`, `best.provenance`, and KST `end`.
3. Run six-park live-data QC and compare payload completeness / forecast horizons.
4. Perform external adversarial code review using `docs/CODE_REVIEW_BRIEF.md`.
5. Fix P0/P1 findings.
6. Build snapshot/replay calibration dataset and evaluate scoring weights / hard gates empirically.
7. Only after that, polish UI / deployment / user testing and merge toward `main`.

## How to resume in a fresh ChatGPT session

Tell the assistant:

> Continue `noru358/eonje-app`. Read `docs/PROJECT_STATUS.md` and `docs/CODE_REVIEW_BRIEF.md` on branch `feat/live-data-v0.6`, inspect the latest CI, then continue from the immediate next steps. Treat the repository as source of truth; do not reconstruct implementation from memory.
