# Agent Product Coherence Gate

Updated: 2026-09-01 KST

## Why this gate exists

The project demonstrated a specific multi-agent failure mode: planning, implementation, reliability, design, and QC can each look locally successful while the resulting product still fails the user's basic question: **why would I use this instead of the obvious substitute?**

In the observed case, intent plumbing existed and the decision engine contained multiple data dimensions, but the first screen exposed mostly a rain/no-go decision. The agents optimized their assigned artifacts without proving that the full user journey delivered differentiated value.

This is not solved by adding another role. It is solved by a binding end-to-end gate.

## Mandatory gate before visual lock, staging, or feature-complete claims

A reviewer acting from a first-time user's perspective must answer all six questions using the actual running product, not plans or code inspection:

1. **Job clarity** — Within 5 seconds, can a first-time user state what decision the product makes for them?
2. **Substitute test** — Can the reviewer explain at least one concrete reason to use this instead of the obvious incumbent/substitute (for `언제`: a normal weather or map app)?
3. **Input-to-output causality** — If the product exposes a preference, mode, filter, or intent, does changing it materially change the output when the underlying data makes that appropriate?
4. **Evidence diversity** — Are repeated reasons actually distinct dimensions, rather than the same signal restated multiple times?
5. **Fallback value** — When the primary answer is negative, does the product reduce the user's next decision rather than merely saying no?
6. **Human editorial pass** — Do the copy, hierarchy, and grouping read like a deliberately edited product rather than a generic component/template assembly?

If any of 1–5 fails, visual lock and staging are blocked for one bounded product-correction loop. Question 6 can block visual lock but must not trigger unrelated feature expansion.

## Black-box test requirement

At least one QC pass per substantial product iteration must be **black-box**:

- reviewer begins from a screenshot or running URL;
- reviewer does not use implementation knowledge to excuse missing value;
- reviewer compares against the most obvious substitute;
- reviewer records the first confusion, first redundant element, and first reason they would leave the product.

Code correctness, API coverage, and component-level design review cannot substitute for this pass.

## Cross-agent integration contract

Roles may remain specialized, but the final acceptance criterion is shared:

> The integrated running product must demonstrate the product job, differentiation, causality, evidence, and fallback end-to-end.

A planner's concept is not complete because it exists in a spec. A developer's feature is not complete because a parameter reaches the server. A designer's screen is not complete because visual hierarchy is clean. A QC agent is not complete because tests pass. The feature is complete only when the black-box gate passes.

## Automation target for future projects

For the next project, create these artifacts before implementation begins:

- one-sentence user job;
- obvious-substitute list (max 3);
- differentiation claim that can be observed in the UI;
- 3–5 black-box acceptance scenarios;
- one negative-result/fallback scenario;
- one deliberately adversarial first-time-user review.

The agent loop should run those scenarios after every substantial product slice. This catches product-semantic drift earlier than late visual QC and reduces rework without adding infrastructure.

## Scope control

Failure of this gate does **not** authorize arbitrary feature expansion. The correction loop must seek the smallest change that makes the differentiated product value visible and actionable. Infrastructure, providers, maps, accounts, analytics, and personalization systems still require the marginal-value gate from the main governance document.
