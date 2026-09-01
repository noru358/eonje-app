# 언제(eonje-app) — Gate 0: Market / Open-source / Build-vs-Adapt

Date: 2026-09-01 KST

## Decision

**GO, but only as a decision product. Do not broaden into a generic Hangang information dashboard.**

The market already contains direct substitutes for live Hangang crowd / parking / weather lookup. The defensible product job for `언제` is narrower:

> **“오늘 한강 언제 가지?” → one supported recommendation window, with uncertainty made explicit.**

The product should absorb raw complexity and return a verdict. A screen that mainly lists crowd, weather, parking, events, or maps is not sufficiently differentiated.

## Direct substitutes found

### 1. Hangangjari / 한강자리

Sources:
- https://hangangjari.app/en/
- https://apps.apple.com/kr/app/id6770830332

Observed positioning/features:
- all 11 Hangang parks
- live Seoul crowd data
- live parking availability
- crowd trend / arrival forecast
- events, facilities, notices
- widgets, favorites, alerts, directions
- public-source freshness disclosure

Implication for `언제`:
- `current crowd + weather + park comparison` is commodity functionality.
- even short-horizon arrival prediction is not by itself a differentiator.

### 2. Hangang Now / 한강나우

Sources:
- https://hangangnow.app/
- https://play.google.com/store/apps/details?id=com.drcloud.hangangnow

Observed positioning/features:
- all 11 Hangang parks
- live congestion and parking
- 12-hour congestion prediction
- weather, fine dust, UV
- park map and facility information

Implication for `언제`:
- simply adding more source dimensions will not create a moat.
- UI polish alone is not enough if the output remains a dashboard.

### 3. Seoul itself is moving toward AI access to live city data

Source:
- https://english.seoul.go.kr/reducing-ai-hallucinations-seoul-launches-the-first-public-data-mcp-service/

Seoul announced a public-data MCP pilot exposing real-time information for major places, including questions such as whether today is a good day to visit the Hangang River.

Implication:
- raw access / natural-language access to public data will become easier.
- durable value must sit above retrieval: decision policy, calibration, evidence quality, and editorial UX.

## Open-source / reusable implementation scan

### Seoul OpenData MCP

Source:
- https://github.com/whchoi98/seoul-opendata-mcp

Relevant patterns:
- TypeScript client with cache/retry/env handling
- domain normalizers
- real captured fixtures
- live sweep scripts
- dataset catalog
- MIT license

Decision:
- **selective reuse of patterns only for now; do not replace current adapters.**
- `eonje-app` already has product-specific Seoul/KMA normalization, source provenance, six-park replay fixtures, live QC, uncertainty handling, and a single verdict contract.
- replacing this with a generic MCP layer would add migration risk without improving the product's differentiation.
- if source expansion becomes expensive, evaluate extracting a generic upstream client layer later.

### WhatSeoul

Source:
- https://github.com/WhatSEOUL/WhatSeoul

Relevant patterns:
- live Seoul weather/population/culture retrieval
- general place recommendation UX

Decision:
- no code adoption currently. Architecture is broader and less aligned with the narrow decision-engine product job.

## Product boundary after Gate 0

### Must be first-class

1. **Verdict** — the best actionable time window.
2. **Evidence** — up to three reasons that genuinely support the whole public window.
3. **Uncertainty** — confidence derived from actual source completeness/freshness, never generic reassurance.
4. **Alternative** — only when there is a meaningful tradeoff.
5. **Share/search surface** — answer-shaped pages, not raw dashboard pages.

### Commodity / supporting only

- current weather card
- current crowd card
- park map
- parking counts
- events/facilities lists
- generic “all parks at a glance” screen

These can support the decision but should not dominate product identity.

## Differentiation test

A feature passes only if it materially improves one of these questions:

- **When should I go?**
- **How sure are you?**
- **Why that time rather than another?**
- **What is the best fallback if my constraints change?**

If a feature does none of these, defer it unless it is required for acquisition, reliability, or compliance.

## Build-vs-adapt decision

**Build/keep:**
- verdict/scoring engine
- uncertainty policy
- recommendation-window compression
- source provenance/freshness model
- replay/QC/calibration harness
- editorial answer UX

**Adapt/reuse patterns:**
- generic API retry/cache conventions
- captured-fixture discipline
- live-sweep ergonomics
- future source catalog abstractions

**Do not build yet:**
- comprehensive Hangang guide
- parking-first product
- event directory
- social/community layer
- native mobile app

## Agent workstream after Gate 0

### Product / Market Agent — ACTIVE

Next output:
- lock the decision-product positioning and acquisition hypotheses.
- later test whether answer pages can win intent such as `오늘 한강 언제`, rather than compete head-on for generic `한강 혼잡도`.

### Data / Calibration Agent — ACTIVE

Priority:
1. hourly AQ provider abstraction in shadow mode
2. candidate AQ forecast logging by lead time
3. crowd uncertainty dataset by source/horizon
4. empirical replacement of bootstrap 6-point crowd penalty
5. score/gate calibration from replay data

### Reliability Agent — ACTIVE

Priority:
1. in-flight request deduplication per place
2. source-dimension freshness model when calibration schema is touched
3. snapshot write failure injection regression if not already covered end-to-end

### UX / Editorial Agent — QUEUED AFTER CALIBRATION CONTRACT

Priority:
- first-screen verdict hierarchy
- uncertainty presentation
- evidence disclosure
- meaningful alternative presentation
- no dashboard creep

### Release Agent — CONTINUOUS GATE

Must block merge if:
- live/replay behavior diverges materially
- unsupported positive claims reappear
- source freshness is misrepresented
- recommendation contract becomes dashboard-first

## Next execution order

1. Complete reliability's small policy-neutral P2 (`in-flight` dedupe) with tests.
2. Add AQ provider abstraction + shadow logging without changing public verdict semantics.
3. Start accumulating calibration snapshots.
4. Define an offline evaluation table for existing weights/gates/crowd penalty.
5. Only then redesign/polish the first screen around the verdict.
6. Deploy an answer-shaped web surface and run user/search validation before merging the product direction to `main`.
