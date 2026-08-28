# 언제(eonje-app) — External Code Review Brief

## 1. Product job

`언제` answers a consumer question: **“오늘 한강 언제 가지?”**

The first screen must return a decisive, low-friction recommendation rather than expose raw data. Product grammar:

`human question → data fusion → normalized slots → safety gates → utility score → recommendation window → reasons / meaningful alternative`

Current v0 scope: six Seoul Han River parks (Yeouido, Banpo, Ttukseom, Mangwon, Jamsil, Ichon).

## 2. Review target

Review branch: `feat/live-data-v0.6`

Do **not** review `main` as the current product implementation. The feature branch contains the live-data and decision-engine work being validated before merge.

Primary files:

- `server.mjs` — HTTP server, data integration, fallback, health endpoint, snapshot persistence, port fallback
- `src/seoul-xml.mjs` — Seoul XML parser
- `src/seoul-adapter.mjs` — Seoul citydata normalization/provenance
- `src/kma-adapter.mjs` — KMA short-term forecast fetch/normalization/merge
- `src/engine.mjs` — deterministic scoring, safety gates, alternatives
- `src/product-verdict.mjs` — product time horizon, primary-window compression, window-level explanation
- `src/verdict-sanitizer.mjs` — prevents unsupported claims from missing/stale data
- `src/data-quality.mjs` — live-data freshness assessment
- `test/` — behavioral/regression tests

## 3. Data sources and current responsibilities

### Seoul Real-Time City Data
Used for:
- current congestion / population
- population congestion forecasts where available
- current air quality
- current UV
- sunset
- Seoul hourly weather fields as baseline/fallback

Important: Korean `citydata` endpoint is requested as XML and parsed server-side.

### KMA short-term forecast
Used for time-varying future weather:
- temperature
- rain probability
- precipitation
- wind

When KMA values merge into a slot, provenance must reflect KMA rather than the pre-merge Seoul/missing source.

## 4. Intentional product decisions — do not “fix” these without arguing product semantics

1. **Night/dawn is not a hard safety gate.**
   Time of day is a soft preference prior. Some users may genuinely prefer dawn/night.

2. **Decision horizon is not simple calendar-day truncation.**
   - Query before 06:00: compare remaining dawn AND the coming daytime/evening.
   - Query 06:00–17:59: compare remaining same-calendar-day slots.
   - Query from 18:00 onward: also allow next-calendar-day 00:00–05:59 as part of “tonight”.

3. **Unknown data is not a positive or negative observation.**
   In particular, `crowd=null/unknown` must never be phrased as “quieter” or compared against a known crowd value.

4. **Current air quality may gate safety but must not be marketed as a future-hour benefit.**
   There is not yet a trusted future AQ forecast in the engine.

5. **The first screen should show a useful window, not fake precision.**
   Closely scored adjacent hours are compressed into a primary recommendation window (currently ~2 hours max) rather than claiming a 0.3-point difference makes one hour uniquely correct.

6. **Meaningful alternatives are conditional.**
   Do not always show a second choice. An alternative should appear only when it offers a real tradeoff on a known dimension (e.g. quieter vs sunset/weather) and is not merely the second-highest score.

7. **Server verdict is the single decision source.**
   Client UI should not independently re-score or choose the slot.

## 5. Current scoring model (hypothesis, not validated truth)

Hard gates currently include severe warning, heavy rain, very high/low temperature, very poor air quality, and extreme wind. These thresholds are still subject to calibration.

Soft score roughly combines:
- weather: 46%
- crowd: 34%
- experience/sunset: 20%
- small event/time-preference adjustments

This weighting is a product hypothesis. Review it for internal consistency and missing-data bias, but do not assume the numbers are empirically calibrated yet.

## 6. Missing-data invariants

Please verify these aggressively:

- Missing future wind must not become “perfect calm wind”.
- Missing future crowd must not inherit current crowd.
- Unknown crowd must not create comparative reason text or a crowd-based alternative.
- Current PM/UV copied as context must not be described as a future forecast.
- High confidence must be downgraded when an important component for the recommended slot is unknown.
- `provenance` must match the actual value source after merges.
- A DEMO fallback must never be presented as LIVE.
- Stale LIVE data must not be presented as fresh/real-time.

## 7. Recent real-data case that motivated fixes

On 2026-08-29 around 03:30 KST, Yeouido live+KMA data produced approximately:
- 19:00 score 86.7 (sunset/experience strongest)
- 20:00 score 87.0 (weather strongest)
- 21:00 score 83.8

Product output should therefore prefer a window such as `19:00–21:00`, not pretend that 20:00 is uniquely superior by meaningful precision.

The same run exposed and motivated fixes for:
- `여유 → null` being incorrectly phrased as “quieter”
- a crowd alternative being generated when the primary candidate crowd was unknown
- stale provenance saying wind was missing even after KMA merge
- UTC/KST representation inconsistency in public verdict fields
- reasons being derived only from the best single slot rather than the recommended window (e.g. sunset inside the window)

## 8. What I want from the reviewer

Please perform an adversarial code review rather than a rewrite.

Prioritize findings by severity:
- **P0**: can produce materially wrong/silent recommendation or unsafe claim
- **P1**: data-source/provenance/timezone/fallback bug that undermines trust
- **P2**: architectural/testability/reliability issue likely to cause future defects
- **P3**: maintainability/performance/style issue

For every finding provide:
1. severity
2. exact file/function
3. concrete failure scenario
4. why current tests may miss it
5. smallest robust fix
6. regression test to add

Specifically audit:
- timezone and midnight/day-horizon behavior
- KMA publication/base-time logic
- Seoul XML parsing assumptions
- missing/NaN/null handling
- scoring under partial data
- hard-gate semantics
- recommendation-window construction
- alternative generation
- confidence calculation
- cache/fallback/staleness behavior
- environment-variable/key handling
- port fallback behavior
- snapshot persistence/privacy
- API consistency (`+09:00` vs `Z`)
- tests for false positives, not only happy paths

## 9. Review constraints

- Do not redesign the whole product unless a P0/P1 issue requires it.
- Do not add an LLM to the decision path; the recommendation must remain deterministic/reproducible.
- Do not treat dawn/night as categorically invalid.
- Do not invent unavailable data.
- Prefer explicit uncertainty over fake precision.
- Preserve “answer first, clarify only when it materially matters”.

## 10. Desired final review output

Return:
1. executive verdict: mergeable / mergeable after fixes / not mergeable
2. P0–P3 findings table
3. top 5 regression tests to add
4. any scoring/data-model assumptions that require empirical validation rather than code fixes
5. a short patch plan ordered by risk reduction
