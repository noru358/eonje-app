# 언제(eonje-app) — Current Project Status

Updated: 2026-08-29 KST (v0.6.3 review follow-up)

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
- Missing forecast hours can no longer be presented as one continuous recommendation window.
- Reasons and confidence are supported by the whole public window, not only the peak hour.
- KMA is named as a source only when at least one field actually merges into a Seoul slot.
- KMA base/grid/count/merge metadata is exposed and persisted; a late latest release retries exactly one prior base.
- Bare Seoul sunset times are anchored to the source observation date for replay/midnight safety.
- Demo dates follow the current Seoul date instead of a frozen 2026 fixture.
- Non-finite optional score inputs cannot poison ranking, and all public verdict timestamps are KST-normalized.

## Current validation status

GitHub Actions runs tests on macOS / Windows / Linux. Remote HEAD `ee26935` passed run #32 on all three operating systems.

The v0.6.3 follow-up commit `291c33d` passes 51 local tests, syntax/demo-server smoke checks, and GitHub Actions run #33 on Ubuntu, macOS, and Windows. In addition to the v0.6.2 uncertainty fixes, it closes the remaining policy-neutral review findings around time adjacency, window-level claims/confidence, actual KMA merge provenance, one-release KMA retry and metadata, source-date sunset anchoring, finite scoring, public KST timestamps, and dynamic demo dates.

See `docs/CODE_REVIEW_RESULT.md` for the full findings and remaining P2/calibration work.

A six-park QC runner is available as `npm run qc:live`. Start the server with both keys first. If port fallback selects another port, set `EONJE_BASE_URL`, for example:

```bash
EONJE_BASE_URL=http://127.0.0.1:4174 npm run qc:live
```

The current review runtime did not contain either API key, so only the runner's six-park DEMO smoke path was executed. Real six-park QC remains mandatory before merge.

## Immediate next steps

1. With both API keys configured, run `npm start` and `npm run qc:live`.
2. Confirm all six parks, especially Yeouido: `windowLabel`, supported `reasons`, `confidenceDetail`, `best.provenance`, KST `end`, completeness counts, and forecast horizon.
3. Save scrubbed real Seoul/KMA fixtures and add snapshot/replay tests using the new source/base/merge metadata.
4. Decide and document the validity horizon for current AQ and the uncertainty policy for missing crowd forecasts.
5. Build the calibration dataset and evaluate scoring weights / hard gates empirically.
6. Only after that, polish UI / deployment / user testing and merge toward `main`.

## How to resume in a fresh ChatGPT session

Tell the assistant:

> Continue `noru358/eonje-app`. Read `docs/PROJECT_STATUS.md` and `docs/CODE_REVIEW_BRIEF.md` on branch `feat/live-data-v0.6`, inspect the latest CI, then continue from the immediate next steps. Treat the repository as source of truth; do not reconstruct implementation from memory.
