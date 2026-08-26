---
name: plan-fm-pro-phase
description: Plan or start one FM-Pro delivery phase with scoped slices, owners, contract gates, dependencies, and measurable exit evidence.
---

# Plan an FM-Pro phase

Use only inside the native `FM-Pro` repository.

1. Read `AGENTS.md`, the selected phase in
   `docs/roadmap/phased-delivery-plan.md`, and only its relevant contracts.
2. Inspect current code and tests before accepting roadmap assumptions.
3. Split the phase into vertical slices. Each slice must name its owner role,
   file/feature scope, dependencies, acceptance evidence, rollback, and debt IDs.
4. Prefer slices that replace and delete one legacy path over horizontal
   scaffolding that leaves two sources of truth.
5. Mark the phase `in progress` only when its first slice is ready to execute.
   Mark `done` only after the documented exit gate is independently verified.
6. Add an ADR only when the plan changes a binding architectural, data, security,
   playback, or UI-technology decision.

Return the ordered slices, critical path, safe parallel work, risks, and exact
verification. Do not implement unless the request includes implementation.
