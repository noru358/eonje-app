# Agent run evidence — 2026-09-01

Purpose: preserve evidence for the end-of-project review of agent structure, time/cost, quality, and automation effect. This is an evidence log, not a new infrastructure layer.

## Baseline

- Source of truth: `feat/live-data-v0.6`.
- Baseline branch head when this run started: `0a1c4ef867dc7c1b483dffd583bc75487b1ff530` (`deploy: add Render staging blueprint`).
- Governance read first: `docs/PROJECT_STATUS.md`, `docs/AGENT_EXECUTION_GOVERNANCE_20260901.md`, `render.yaml`.
- Governance decision honored: project had crossed the threshold where staging/user validation had higher marginal value than speculative reliability infrastructure.
- Render blueprint targets `feat/live-data-v0.6`, free Node service in Singapore, `npm install`, `npm start`, `/api/health`, auto-deploy on commit.

## Autonomous work in this run

### Deployment sequencing

To preserve the requested order — Windows local inspection before staging deployment — design work was isolated on `design/visual-polish-v0.6` rather than committed directly to the Render-watched source branch.

This avoided an automatic staging deploy before local visual approval.

### First visual intervention

The initial intervention kept product semantics intact and added a CSS-only visual layer. It improved contrast and finish, but the Windows screenshot exposed a more important problem than presentation quality.

### Black-box product QC failure

Observed running screen at desktop width:

- primary result: `오늘은 패스`;
- visible evidence consisted mainly of repeated `비 가능성 높음` reasons;
- no visible user intent/preference control;
- no useful fallback when the selected park was rejected;
- no spatial context beyond the park name;
- polished but generic rounded-card/glass treatment created a strong template/AI-generated impression.

User feedback matched the black-box diagnosis:

1. The page felt like a trivial weather-app wrapper rather than a distinctive Hangang decision product.
2. Rain/no-go did not explain why the service deserved a visit.
3. Festival/crowd/preferences such as sunset were not visible in the experience even where some underlying signals existed.
4. The design and copy felt obviously AI-generated and required substantial deslop.

### Root-cause finding in code

The code revealed that the system already accepted an `intent` query parameter end-to-end at the HTTP/product-verdict boundary. However, the engine only gave special time preference behavior to `night`; the intended product concept was therefore only partially implemented and was not exposed in the UI.

This is evidence of a multi-agent integration failure rather than a simple missing-role failure: planning concepts, server plumbing, data/reliability work, and visual polish could all pass local checks while the running product failed the substitute/value test.

### Marginal-value redirect

Staging was intentionally paused for one bounded product-correction loop because deploying the known failure would mostly reproduce feedback already available locally.

Implemented without new runtime dependencies, accounts, databases, providers, or infrastructure:

- `src/intent-policy.mjs`: lightweight preference policy for general outing, picnic, running, and sunset viewing; safety hard gates remain untouched;
- `src/product-verdict.mjs`: applies the preference lens before server-side verdict generation, preserving the server as the single decision source;
- first-screen intent chips that actually re-query the server;
- same-park meaningful alternative surfaced when available;
- cross-park fallback search only when the selected park is `avoid`, limiting extra API work to the negative-result case;
- six-park schematic location view in the place sheet plus external map link for the selected park;
- `public/product-correction.css`: editorial/deslopped hierarchy with fewer rounded cards and less decorative chrome;
- targeted intent-policy regression tests;
- `docs/AGENT_PRODUCT_COHERENCE_GATE_20260901.md`: reusable black-box product gate for this and future projects.

## Why this correction is within scope

This loop repairs the core decision product rather than expanding into a generic Hangang dashboard. It reuses existing six places, existing data, existing verdict endpoint, existing alternative concept, and existing scoring architecture.

Deferred intentionally:

- login/account personalization;
- database-backed preference profiles;
- full tile-based map product;
- festival/event provider expansion;
- paid providers;
- new monitoring/analytics infrastructure;
- speculative reliability work.

## Agent-structure lesson preserved for final review

Observed failure mode:

> Local agent success != integrated product success.

Specific missing acceptance test:

> Can a first-time user explain within seconds why this product is more useful than the obvious substitute, and can they observe their chosen intent changing the decision?

The corrective governance does not add another supervisory role. It adds a mandatory end-to-end black-box gate before visual lock/staging.

## Evidence to collect next

1. CI/deterministic test result for the product-correction branch.
2. Windows local screenshot after correction, desktop and preferably mobile-width.
3. Black-box coherence gate result: job clarity, substitute test, input-output causality, evidence diversity, fallback value, human editorial pass.
4. Only after that: merge/fast-forward into `feat/live-data-v0.6`.
5. Render staging deployment URL, health result, deployed SHA.
6. Any Render build/runtime failure and exact fix cost.
7. User-facing issues found only after staging.

## Review interpretation

The useful automation lesson is not that specialization is useless. Specialized agents caught many correctness defects. The failure was that no binding integration criterion required the actual running product to prove differentiated value. Future automation should keep specialized roles but move black-box product coherence checks earlier and make them release-blocking.
