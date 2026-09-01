# 언제(eonje-app) — Agent Execution Governance

Updated: 2026-09-01 KST

## Why this exists

The previous role-based workflow improved local correctness but did not reliably stop low-marginal-value infrastructure work. Product, reliability, data, and QC roles each optimized their own local objective; none had a binding stop condition that asked whether the project should now move to deployment/user validation.

The fix is **not another agent role**. The fix is a shared execution contract that every role must obey.

## Product objective

Current v0 job: **“오늘 한강 언제 가지?”**

The system should answer:

1. When should I go?
2. Why that time?
3. How sure are you?
4. What is the meaningful fallback?

Do not expand into a generic Hangang information dashboard unless a feature clearly improves one of those four answers or acquisition/operations required for launch.

## Scale assumptions

Unless evidence changes them, work under these assumptions:

- Supported places: 6.
- Expected initial concurrent users: <= 100.
- Seoul real-time city population data can update on a 5-minute cadence; do not treat all Seoul data as a 3-hour source.
- KMA village forecast publishes 8 times/day (02, 05, 08, 11, 14, 17, 20, 23 KST).
- This is an initial public/staging product, not a high-scale distributed system.

If a proposed change only matters beyond these assumptions, do not implement it without evidence that the assumption is already being exceeded.

## Mandatory stage gate before new infrastructure

Before adding a queue, worker, cache layer, limiter, background service, database, monitoring service, or new provider, answer all four questions:

1. What observed failure or launch blocker requires it now?
2. Can the same problem be solved with the existing process or deployment platform for less complexity?
3. Does it materially improve launch readiness, user decision quality, or data collection needed to validate the decision?
4. Is its maintenance surface justified for 6 places and <=100 concurrent users?

If any answer is unclear, **do not implement the infrastructure yet**. Record it as a conditional follow-up.

Existing reliability code is not removed merely because a simpler architecture might make it unnecessary later. Refactor only when the deployment/store design creates a concrete simplification or availability benefit.

## Stop / redirect rule

At the end of each autonomous work loop, evaluate marginal value across four destinations:

- correctness/reliability
- deployment
- data/calibration
- user/product validation

Do not automatically continue in the same workstream. If another destination now has higher expected value, stop local optimization and redirect the project.

A green deterministic test suite plus successful strict live QC is a strong signal to consider deployment/user validation before adding more reliability machinery.

## Change budget

For one autonomous loop:

- New runtime dependencies: 0 by default.
- New infrastructure systems: 0 by default.
- Prefer modifying an existing component over creating a new abstraction unless a regression test demonstrates the abstraction prevents a real repeated failure.
- Every newly discovered correctness bug should receive a targeted regression test when practical.
- Do not add tests solely to increase test count.

## Current stage decision

As of the latest validated live-data branch, the project has crossed the threshold where further reliability work has lower expected value than staging deployment and real-world data/user validation.

Therefore the current priority is:

1. staging/public deployment path;
2. durable decision/evidence logging appropriate to the chosen hosting environment;
3. verify API quotas/terms and six KMA grid locations before public launch;
4. collect real decision/forecast/observation data;
5. only then make empirically justified scoring changes or build a golden replay when verdict logic needs revision.

## CI policy

- Deterministic tests run on the production OS target (Ubuntu/Linux).
- Strict live QC is scheduled/manual, not a per-push development gate, because it depends on external API availability.
- A live-QC failure is evidence to inspect upstream health or a regression; it must not be made green by weakening data-honesty contracts.

## Explicit non-goals for the next stage

Do not build yet:

- another agent role solely for oversight;
- a generic Hangang dashboard;
- new paid AQ providers;
- golden replay before enough real snapshots exist and verdict logic actually needs changing;
- production-scale distributed infrastructure;
- speculative alerts for shadow-only data.

## Required project-level review question

Before each next substantial task, answer:

> **If we do not do this now, does it block deployment, trustworthy use, or collection of evidence needed to decide what to build next?**

If the answer is no, defer it.
