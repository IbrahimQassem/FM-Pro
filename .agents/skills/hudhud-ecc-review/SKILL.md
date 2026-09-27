---
name: hudhud-ecc-review
description: Review a HudHud roadmap card or cross-component flow and produce a scoped verification report for the ECC pilot. Use for PL-card acceptance reviews or a requested ECC review, rather than routine UI edits.
license: MIT
---

# HudHud ECC review pilot

Work inside `hudhud_fm`. Project AGENTS files, contracts and the user's authorized
scope govern this workflow. This is a local adaptation, not the ECC agent runtime.
Read [pilot scope and provenance](../../../docs/operations/ecc-pilot.md) for the
initial trial. Other paths below are relative to the repository root.

## Scope the review

- Read the selected PL card in `docs/roadmap/platform-development-plan.md`, its
  linked TD findings, relevant role and contracts. Record the baseline commit and
  working-tree state; distinguish existing findings from newly discovered defects.
- Define the observable acceptance journey, affected components and review-only
  versus implementation scope before editing. Preserve unrelated work.
- Trace producer, stored data, consumer and failure/retry paths. For Firebase,
  include Rules, counter ownership and both roots in demo emulators. Verify that
  fixtures represent data the real producer creates; pre-corrected fixtures can
  conceal integration failures.

## Evidence and verification

- Report a finding with source location, triggering state, observed consequence,
  existing guard/test gap and smallest repair direction. Label source inference
  separately from reproduced behavior. Do not manufacture findings or raise
  severity for style preferences.
- In a requested flow review, unchanged code is in scope when it participates in
  that flow. In a patch review, identify pre-existing defects separately.
- Select existing checks using `docs/operations/codex-workspace-setup.md` and
  current package scripts. Use the supported Node 22 toolchain where required.
  Preserve exit codes; a successful output filter is not a successful test.
- Use a failing acceptance probe plus a passing control when that distinguishes
  a suspected behavior defect from broken test setup. Record intentional failures
  as failures; never count an expected red probe as product acceptance.
- Review staged, unstaged and new files. Inspect sensitive logging by location
  and behavior without printing secrets, account data or environment files.
- Report command, scope, result, and untested boundaries. Unit/emulator success
  does not establish real-device, production or store readiness. Rerun checks only
  after relevant changes, failures or unresolved concerns.

## Deliver

Record findings under existing PL/TD identifiers, evidence and remaining acceptance
criteria. A review alone does not close an implementation card. For the pilot,
record defects reproduced, net-new findings, rework and measured time/token cost
when available; mark unavailable metrics instead of estimating savings.

Use the session's authorization for fixes. This workflow adds no deployment,
messaging, autonomous delegation, background observation or global configuration.
