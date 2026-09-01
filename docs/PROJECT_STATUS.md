# 언제(eonje-app) — Current Project Status

Updated: 2026-09-01 KST (Gate 0 + strict live QC + AQ shadow/calibration)

## Current branch

`feat/live-data-v0.6`

This branch, not `main`, is the current development source of truth until live-data validation, calibration, and release review are complete.

## Product job

Current v0 question: **“오늘 한강 언제 가지?”**

Current parks: Yeouido, Banpo, Ttukseom, Mangwon, Jamsil, Ichon.

First-screen goal: one decisive recommendation window, up to 3 supported reasons, optional meaningful alternative, progressive disclosure for evidence. No fake precision and no unsupported claims.

## Gate 0 product decision

Market/open-source Gate 0 is complete. See `docs/GATE0_MARKET_REUSE_20260901.md`.

Direct Hangang products already provide combinations of live crowd, parking, weather, events, and short-horizon predictions. Therefore `언제` must not drift into a generic Hangang dashboard. Its differentiated job remains the decision layer:

> **When should I go, why that time, how sure are you, and what is the meaningful fallback?**

Generic raw-data cards, maps, parking, events, and guide content are supporting/commodity features unless they materially improve that decision.

The current Seoul/KMA adapters, provenance, replay fixtures, and QC are retained. Generic open-source Seoul data clients may supply reusable patterns, but replacing the product-specific pipeline is not justified.

## Live integrations confirmed

- Seoul Real-Time City Data: LIVE connection confirmed via XML endpoint.
- KMA short-term forecast: LIVE connection confirmed and merging temperature/rain/precipitation/wind.
- Open-Meteo/CAMS AQ: 48-hour PM2.5/PM10 **shadow forecast** collection confirmed; it does not affect public verdict/scoring.
- Freshness metadata working.
- Demo fallback remains explicit.
- Snapshot artifacts contain source metadata needed for later calibration.

## Important product semantics already decided

- Dawn/night is not a hard gate.
- Query before 06:00 still compares the coming daytime/evening.
- Evening queries may include next-day 00:00–05:59 as “tonight”.
- Unknown data is not a positive/negative observation.
- Current AQ can act as safety context/gate but must not be claimed as future AQ.
- A current AQ observation may gate only slots within 90 minutes of its observation time. Later slots require a validated future AQ forecast or remain explicitly unknown.
- AQ shadow data is observation/calibration input only until empirical validation is sufficient.
- Missing crowd uses a neutral expected-utility value, plus a separate 6-point selection penalty until replay data can calibrate source/horizon-specific uncertainty.
- Server verdict is the single decision source.
- Recommendation windows should avoid fake precision.
- Alternatives only appear for a meaningful, supported tradeoff.

## Reliability / QC fixes now guarded

- Seoul `citydata` uses XML, not the unsupported JSON assumption.
- Seoul 24h forecast is not truncated to 12 slots.
- Current wind/crowd are never copied into future slots.
- Missing/non-numeric values remain unknown rather than becoming benign zero/default values.
- KMA partial rows merge field-by-field and cannot overwrite missing rain fields with zero.
- KMA merge updates field-level provenance.
- `crowd=null` cannot create “quieter” claims or crowd alternatives.
- Missing important forecast inputs cap confidence.
- Broad recommendation windows are compressed around the peak without bridging missing hours.
- Reasons and confidence must support the whole public window, not only the peak hour.
- Public verdict timestamps are KST-normalized.
- KMA is named as a source only when at least one field actually merges into a Seoul slot.
- KMA base/grid/count/merge metadata is exposed and persisted; a late latest release retries exactly one prior base.
- KMA requests ask for enough rows and QC fails on response truncation.
- Windows QC writes UTF-8 directly rather than corrupting Korean through legacy PowerShell piping.
- Bare Seoul sunset times are anchored to the source observation date for replay/midnight safety.
- Demo dates follow the current Seoul date.
- Non-finite optional score inputs cannot poison ranking.
- Current AQ provenance carries observation time; expired observations cannot gate distant future slots or support positive AQ copy.
- Expected utility and evidence quality are separated through `selectionScore`.
- Same-place concurrent cache misses are single-flighted so Seoul/KMA requests do not stampede; different parks remain parallel.
- Failed in-flight requests are cleared so later requests can retry.
- Live QC no longer treats “KMA key configured” as “KMA worked”: it requires actual KMA metadata, no truncation, a real merge, and source-specific coverage for actionable future slots.
- A transient KMA timeout/408/425/429/5xx gets one bounded retry. Every retry receives a fresh timeout signal; deterministic failures are not hidden.
- AQ shadow parsing preserves missing values as `null`; missing PM cannot become zero.

## Uploaded prior QC review

The earlier QC artifact exposed two historical issues:

1. A KMA response with `totalCount=1052` and only 1000 received rows was marked `truncated=true` but still had `issues=[]`.
2. Windows PowerShell output corrupted Korean text.

Both were already corrected in the subsequent artifact (`receivedItems === totalCount`, `truncated=false`, UTF-8 output). The new QC is stricter again: it separately verifies actual KMA provenance/coverage rather than relying on overall values that may exist from Seoul fallback.

## Current validation status

The suite now includes regression coverage for live/replay semantics, missing-data honesty, in-flight dedupe, AQ shadow normalization, calibration pairing, transient retries, and fresh retry abort signals.

At commit `ec2cf6d`, the full unit suite passed 67 tests, while the newly strict LIVE-QC correctly failed because all six KMA calls timed out. This exposed a second retry bug: the first implementation reused an already-aborted `AbortSignal`, so the retry was not independent.

Commit `f6bb4e1` gives every transient retry a fresh 7-second timeout signal and adds a regression test requiring distinct non-aborted signals. On GitHub Actions live-QC run #25, the strict six-park `npm run qc:live:auto` step then passed with Seoul, actual KMA coverage, and Open-Meteo AQ shadow enabled. Final screenshot/artifact upload for that run was still completing when this status was written.

No API key is stored in the repository or replay fixtures.

## Calibration infrastructure

`npm run calibrate:snapshots -- <snapshot.jsonl> [more.jsonl ...]` is available.

The evaluator pairs earlier forecasts with later observations for the same park/hour and reports:

- AQ: PM2.5 / PM10 count, MAE, bias, RMSE by lead-time bucket.
- Crowd: exact accuracy, mean absolute ordinal error, and bias by lead-time bucket.

Lead-time buckets are `1–3h`, `4–6h`, `7–12h`, `13–24h`, `25h+`.

These are diagnostics only. Do **not** replace the 6-point crowd penalty, AQ policy, weights, or hard gates until there are enough observations across multiple dates, parks, weather/crowd regimes, and lead times.

## Current first-screen / UX decision

The latest live preview already preserves the intended hierarchy: verdict first, large recommendation window, then supported reasons. No substantial UI redesign is justified before calibration/reliability work; changing it now would be modification for its own sake.

## Immediate next steps

1. Let live-QC/snapshot artifacts accumulate across materially different observation times; run the offline calibration report against them.
2. Add source-dimension timing/freshness diagnostics without changing current public quality semantics.
3. Once sample sizes are sufficient, estimate crowd error by lead time and test replacements for the bootstrap 6-point penalty; evaluate weights/hard gates in the same offline harness.
4. Evaluate Open-Meteo/CAMS AQ forecasts against later Seoul observations. Add Google Air Quality as a second shadow candidate only if/when its API key/billing setup is justified.
5. Keep UI verdict-first; after calibration, perform targeted editorial/UX polish rather than dashboard expansion.
6. Deployment/user-search validation comes after reliability/calibration. Do not merge to `main` yet.

## User-intervention boundaries

No user action is required for the current code/test/QC/calibration work.

User input becomes appropriate only when one of these is reached:

- choosing/authorizing a paid or billed external AQ provider such as Google Air Quality;
- enabling a recurring scheduled GitHub Actions data-collection job that would consume ongoing Actions minutes;
- choosing a hosting/domain/deployment account or accepting its cost/terms;
- approving an empirically supported scoring-policy change if it materially changes product behavior.

## How to resume in a fresh ChatGPT session

Tell the assistant:

> Continue `noru358/eonje-app`. Read `docs/PROJECT_STATUS.md` and `docs/GATE0_MARKET_REUSE_20260901.md` on branch `feat/live-data-v0.6`, inspect the latest test + live-qc runs, then continue from the immediate next steps. Treat the repository as source of truth; do not reconstruct implementation from memory.
