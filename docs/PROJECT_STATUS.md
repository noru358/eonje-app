# 언제(eonje-app) — Current Project Status

Updated: 2026-09-02 KST (AQ/crowd uncertainty policy)

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
- A current AQ observation may gate only slots within 90 minutes of its observation time. Later slots require a future AQ forecast or remain explicitly unknown.
- Missing crowd uses a neutral expected-utility value, plus a separate 6-point selection penalty until replay data can calibrate source/horizon-specific uncertainty.
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
- Current AQ provenance now carries its observation time; expired observations cannot gate distant future slots or support positive AQ copy.
- Expected utility and evidence quality are separated through `selectionScore`, so an unsupported crowd estimate must beat an evidence-backed candidate by a meaningful margin.
- Current observed wind may fill only the matching current-hour slot; it is never copied into later forecast hours, and KMA replaces it when an hourly forecast exists.

## Current validation status

GitHub Actions runs tests on macOS / Windows / Linux. Remote HEAD `ee26935` passed run #32 on all three operating systems.

The v0.6.3 follow-up commit `291c33d` passes 51 local tests, syntax/demo-server smoke checks, and GitHub Actions run #33 on Ubuntu, macOS, and Windows. In addition to the v0.6.2 uncertainty fixes, it closes the remaining policy-neutral review findings around time adjacency, window-level claims/confidence, actual KMA merge provenance, one-release KMA retry and metadata, source-date sunset anchoring, finite scoring, public KST timestamps, and dynamic demo dates.

The AQ/crowd policy commit `6eb76d6` passes 55 local tests and GitHub Actions run #35 on Ubuntu, macOS, and Windows. A Windows-side six-park run then confirmed all parks as LIVE/fresh with 24 hourly weather slots, 12 crowd-forecast slots, KST ends, and no recommendation contract issues. It exposed two QC-path defects: KMA returned 1,052 items while the request capped results at 1,000, and Windows PowerShell `Tee-Object` corrupted Korean output. Commit `3a57f51` requests 2,000 KMA rows, fails QC on truncation, writes UTF-8 directly, and passed CI run #37 on all three operating systems.

The post-fix Windows run confirmed `receivedItems === totalCount` (1,016), `truncated=false`, and complete KMA coverage for every still-actionable future slot. The latest normalized public-data records for all six parks are now a scrubbed replay fixture with no keys, and the suite passes 56 tests. `npm run qc:live:auto` now starts a temporary server on a free port, waits for health, runs six-park QC, writes evidence, and shuts down in one command. Codespaces and a manually triggered GitHub Actions LIVE-QC workflow are configured so machine-specific setup can be retired after the two repository secrets are registered once.

See `docs/CODE_REVIEW_RESULT.md` for the full findings and remaining P2/calibration work.

A six-park QC runner is available as `npm run qc:live:auto`; it owns the server lifecycle and port selection. `npm run qc:live` remains available when validating an already running server.

```bash
EONJE_BASE_URL=http://127.0.0.1:4174 npm run qc:live
```

No API key is stored in the repository or replay fixture.

## Immediate next steps

1. Register `SEOUL_API_KEY` and `DATA_GO_KR_API_KEY` once as GitHub Actions secrets (and Codespaces secrets if browser development is desired), then run the `live-qc` workflow once.
2. Add an hourly AQ provider abstraction and shadow-log candidate forecasts; compare Google Air Quality and Open-Meteo/CAMS against later Seoul observations by lead time.
3. Build the calibration dataset and replace the bootstrap 6-point crowd penalty with source/horizon-specific empirical uncertainty; evaluate scoring weights / hard gates at the same time.
4. Before substantial new product work, run a market/open-source Gate 0: comparable products, reusable implementations, differentiation, and build-vs-adapt decision.
5. Only after that, polish UI / deployment / user testing and merge toward `main`.

## How to resume in a fresh ChatGPT session

Tell the assistant:

> Continue `noru358/eonje-app`. Read `docs/PROJECT_STATUS.md` and `docs/CODE_REVIEW_BRIEF.md` on branch `feat/live-data-v0.6`, inspect the latest CI, then continue from the immediate next steps. Treat the repository as source of truth; do not reconstruct implementation from memory.
