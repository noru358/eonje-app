# 언제 — Redesign / Framer / External-AI Handoff

Updated: 2026-09-01 KST

Purpose: run the redesign in four explicit stages, preserve the current backend/data work, and enable an independent AI or Framer-based design review without re-planning the project from scratch.

## Source of truth / current state

- Repo: `noru358/eonje-app`
- Product source branch: `feat/live-data-v0.6`
- Current redesign branch: `design/visual-polish-v0.6`
- Current product job has drifted from a distinctive Hangang decision product toward a weather/no-go surface. Treat that as a failed product-coherence result, not as a reason to discard the backend.
- Preserve the current live-data adapters, data honesty rules, scoring safety gates, and deterministic tests unless a concrete redesign requirement forces a change.
- Do **not** rebuild infrastructure, add login, add a database, or add new data providers merely to make the redesign look richer.

## Target user / acquisition context

Primary entry scenario: a Korean user arrives from Naver search or a shared link. Assume the person is not especially AI-literate, does not know the product concept, and will decide within a few seconds whether the page is worth using.

The first screen must therefore answer, visually and immediately:

1. What is this for?
2. What do I do here?
3. What useful answer do I get that Naver Weather / generic weather apps do not already give me?

## Product value statement to preserve

The product should combine multiple signals to answer an actionable Hangang outing decision, not merely display weather.

Preferred front-end framing:

> 오늘 한강에서 뭐 할까? 어디로 언제 갈까?

The backend can remain a decision engine over six Hangang parks and time slots. The frontend should make that comparison value visible.

---

# Stage 1 — Reference pattern analysis

Do not copy a single product wholesale. Extract patterns by job.

## Reference A — Toss

Borrow:
- Value First: show the benefit before asking for effort.
- Clear Action: a first-time user should know what to tap without reading instructions.
- Easy to Answer: intent selection should be easy and low-friction.
- Explain Why: make the recommendation inspectable.
- One Thing / Minimum Features: do not turn the first screen into a dashboard.

Apply to `언제`:
- The product should not open with a settings form.
- A small set of intuitive outing intents is acceptable: `노을`, `산책`, `러닝`, `피크닉`.
- Selecting one should visibly change the recommendation.

## Reference B — Apple Weather / Apple consumer UI

Borrow:
- Strong single visual hierarchy.
- Ambient visual context rather than stacks of same-weight cards.
- Large, instantly understandable state/answer.
- Secondary evidence recedes until needed.

Apply to `언제`:
- Do not put the whole product inside one white rounded SaaS card.
- Let the main recommendation dominate the page.
- The environment/background can carry mood/context, but must not reduce legibility.

## Reference C — Naver Map / Kakao Map / Google Maps

Borrow:
- Place is spatial, not just a dropdown label.
- Nearby alternatives and relative location are obvious.
- A user can move from recommendation to navigation.

Apply to `언제`:
- Show six supported parks spatially or through a compact map/list hybrid.
- If the chosen park is poor, offer another park as a concrete fallback.
- External map navigation is an action, not the core product.

## Reference D — Airbnb / discovery products

Borrow:
- Intent/category selection can be visual and inviting instead of form-like.
- Discovery feels consumer-facing rather than administrative.

Apply to `언제`:
- Intent controls should not look like generic filter pills if another form is more appealing.
- Use iconography, imagery, or concise labels only if they improve first-glance comprehension.

## Reference E — Linear

Borrow:
- Dim secondary chrome so main content dominates.
- Calm consistency, but not uniform visual weight.

Apply to `언제`:
- Source metadata, freshness, share, confidence, and detailed evidence should not compete with the recommendation.

## Anti-reference

Avoid blindly copying:
- generic AI SaaS dashboards;
- white card + rounded pills + light-gray border everywhere;
- Awwwards-style interaction spectacle that delays comprehension;
- data dashboards where every source metric is visible before the decision.

---

# Stage 2 — Three IA directions

Generate all three before choosing one. They must share the same backend capabilities but differ substantially in interaction model and visual structure.

## IA A — Recommendation-first + spatial proof

Best for: simplest consumer experience.

First viewport:
1. Brand, minimal utility chrome.
2. Prompt: `오늘 한강에서 뭐 하고 싶어?`
3. Intent selector: 노을 / 산책 / 러닝 / 피크닉.
4. Main editorial verdict, not inside a dominant dashboard card:
   - `오늘 노을이면 망원이 제일 낫다.`
   - `18:10–19:20`
   - one evidence line: `일몰 18:43 · 바람 약함 · 여의도보다 덜 붐빔`
5. Compact six-park spatial map immediately below or alongside the verdict.
6. One clear action: `지도에서 보기` or `가는 길`.
7. `왜 망원이야?` opens evidence.

Evidence view:
- time strip;
- 3–4 genuinely different signals;
- explicit comparison against the selected/current alternative;
- confidence/data caveats only here unless materially important.

## IA B — Map-first decision explorer

Best for: place comparison is the core differentiator.

Desktop first viewport:
- left: very small intent selector + recommendation summary;
- right: large Hangang map with six park states.

Mobile:
- recommendation sheet over a map, but do not imitate a generic map app too literally.

Map states should be editorial, not raw-score labels:
- 추천
- 괜찮음
- 붐빔
- 비
- 애매

Selecting a park updates its best time and explanation.

Risk:
- can become another map dashboard.
- reject if the map overwhelms the actual decision.

## IA C — Ranked outing cards / editorial discovery

Best for: users who do not know which park they want.

First viewport:
1. intent selector.
2. sentence: `오늘 노을 보려면 이 순서.`
3. horizontally scrollable or stacked ranked recommendations:
   - #1 망원 · 18:10–19:20 · 추천
   - #2 반포 · 18:20–19:30 · 괜찮음
   - #3 이촌 · 18:00–19:00 · 괜찮음
4. cards may contain real park photography/ambient imagery, but recommendation text must remain legible and fast.
5. a small map appears after the ranking, not before.

Risk:
- can look like a travel content site rather than a decision utility.

---

# Stage 3 — Framer brief

Use this exact brief in Framer AI or another website-design AI. Upload the current `언제` screenshot as a negative-current-state reference if the tool allows image reference. Tell the tool not to preserve the existing white-card composition.

## Framer master prompt

```text
Design a production-quality responsive Korean consumer web experience for a service called “언제”.

PRODUCT JOB
The service helps a person decide what to do at the Han River today, which Hangang park to choose, and when to go. It compares six Hangang parks using time-varying signals such as rain, temperature, wind, crowding, sunset/experience timing, and data confidence. The product must feel meaningfully more useful than a weather app.

PRIMARY USER
A mainstream Korean user arriving from Naver search. Assume low familiarity with AI products and low patience. Within 3–5 seconds, the page must be obvious, inviting, and useful without instructions.

CORE USER FLOW
1. User sees “오늘 한강에서 뭐 하고 싶어?”
2. User chooses one simple outing intent: 노을 / 산책 / 러닝 / 피크닉.
3. The page immediately gives one decisive answer, e.g. “오늘 노을이면 망원이 제일 낫다.” and a recommended time window.
4. The page shows how the six supported parks compare spatially or in a ranked view.
5. The user may open “왜?” to see concise evidence and tradeoffs.
6. If the selected/current park is poor, the product must offer a concrete alternative park or time instead of only saying NO.
7. The user can open the recommended park in a map/navigation service.

DESIGN PRINCIPLES
- Consumer product, not SaaS dashboard.
- Do not use one giant white rounded card as the whole app.
- Avoid generic AI aesthetics: excessive pills, repeated rounded cards, faint gray borders, glassmorphism everywhere, purple gradients, decorative analytics cards.
- Strong Apple-like visual hierarchy: one dominant answer, calm secondary information.
- Toss-like simplicity: value first, obvious action, no learning required.
- Map/discovery patterns may draw from Naver Map, Kakao Map, Google Maps, and Airbnb, but do not clone them.
- The recommendation should feel editorial and human, not generated copy.
- Use Korean typography with excellent readability on desktop and mobile.
- Mobile is critical.

CONTENT EXAMPLE
Intent: 노을
Primary answer: “오늘 노을이면 망원이 제일 낫다.”
Time: “18:10–19:20”
Evidence line: “일몰 18:43 · 바람 약함 · 여의도보다 덜 붐빔”
Six parks: 여의도, 반포, 뚝섬, 망원, 잠실, 이촌
Possible park states: 추천 / 괜찮음 / 붐빔 / 비 / 애매
Evidence section title: “왜 망원이야?”
Fallback example: “여의도에 꼭 가야 한다면 20:30 이후가 그나마 낫다.”

GENERATE THREE SUBSTANTIALLY DIFFERENT DIRECTIONS, NOT COLOR VARIANTS:
A. Recommendation-first with compact spatial map.
B. Map-first comparison explorer.
C. Ranked editorial outing recommendations with imagery and a secondary map.

FOR EACH DIRECTION
- Desktop home screen.
- Mobile home screen.
- Expanded evidence state.
- Poor/no-go state with a useful fallback.
- Explain the main interaction model in 3 bullet points.

Do not invent backend functionality such as accounts, chatbots, AI assistants, personalization profiles, notifications, or event APIs. The design must work with the existing six-park time recommendation engine.
```

## Important Framer instruction after first generation

If Framer returns three variants that are only color/style variations, send:

```text
These are too structurally similar. Redesign the information architecture, not the color palette. Direction A must be recommendation-led, B must be map-led, and C must be ranked/editorial. Change component hierarchy, spatial layout, first interaction, and evidence disclosure. Do not preserve the giant centered SaaS card pattern.
```

---

# Stage 4 — Comparative review and selection

Do not select the most beautiful screenshot. Evaluate the design as an actual Naver-entry utility.

Score each direction 0–5 on each criterion.

| Criterion | Weight | Question |
|---|---:|---|
| 5-second comprehension | 20 | Can a first-time user say what the service does almost immediately? |
| Differentiation | 20 | Is it visibly more than a weather app? |
| Clear next action | 10 | Is the first tap obvious? |
| Decision usefulness | 15 | Does the design surface place + time + intent + fallback, not just data? |
| Mobile usability | 10 | Does the main value survive a narrow phone viewport? |
| Evidence clarity | 10 | Can the user understand why without reading a dashboard? |
| Consumer appeal | 10 | Does it feel inviting enough to click/use from Naver search? |
| Implementation fit | 5 | Can it be implemented over the current backend without speculative infrastructure? |

Total weighted score: 100.

## Hard rejection criteria

Reject a direction regardless of score if any apply:
- looks like a generic AI/SaaS dashboard;
- the user must understand scoring internals before receiving value;
- intent controls do not visibly alter the answer;
- a NO state ends without useful fallback;
- map is decorative rather than decision-supporting;
- first viewport has too many equal-weight cards;
- requires backend features we do not have merely to make the mockup convincing.

## Selection protocol

1. User picks a subjective favorite independently.
2. Internal design/product reviewer scores all three.
3. External AI reviewer scores all three using the exact same rubric below.
4. Compare disagreements, especially on 5-second comprehension and differentiation.
5. Select one direction or a clearly specified hybrid of at most two directions.
6. Only then implement in `eonje-app`.

---

# External AI validation prompt

Give the external AI:
- the current `언제` screenshot;
- the three Framer design screenshots or share links;
- optionally this document.

Then paste exactly:

```text
You are an independent product-design and UX reviewer. Do not assume the proposed redesign is good and do not be polite for its own sake.

CONTEXT
This is a Korean web product called “언제”. A mainstream user may arrive from Naver search with no prior explanation. The backend compares six Hangang parks and time slots using weather, crowding, sunset/experience timing, and related data. The intended frontend job is: “오늘 한강에서 뭐 할까? 어디로 언제 갈까?”

The current product was rejected because it looked like a generic AI/SaaS weather card and often reduced the answer to “rain -> pass”. We are redesigning the frontend while preserving the existing backend unless a real product need requires change.

TASK
Review the current screenshot and each proposed redesign as if you were a first-time Korean consumer. Do not reward technical sophistication that is invisible to the user.

For each proposal, score 0–5 and explain:
1. 5-second comprehension
2. Visible differentiation from Naver Weather / generic weather apps
3. Clear first action
4. Usefulness of place + time + intent + fallback decision
5. Mobile usability
6. Clarity of explanation/evidence
7. Consumer appeal / desire to interact
8. Whether it feels human-designed vs generic AI-generated UI
9. Whether the map, if present, materially improves the decision
10. Whether the design can be implemented with the stated existing backend instead of requiring fake features

Then:
- rank the proposals best to worst;
- identify the single biggest failure in each;
- identify any proposal that should be rejected outright;
- recommend one final direction or a hybrid of at most two;
- give 5 concrete changes before implementation;
- explicitly state whether you would personally continue using the site after landing from Naver search and why.

Be adversarial. The goal is to prevent another polished-but-pointless design from reaching staging.
```

---

# What to return to ChatGPT after Framer / external review

Return any of the following:
- Framer share URLs for A/B/C; or
- screenshots of A/B/C desktop + mobile; and
- the external AI's review text.

Then the next implementation step is:

1. score A/B/C using the shared rubric;
2. select one direction;
3. write a concrete implementation spec mapped to existing DOM/API structures;
4. implement only that direction on the redesign branch;
5. black-box QC locally;
6. if coherent, merge to `feat/live-data-v0.6` and deploy Render staging.
