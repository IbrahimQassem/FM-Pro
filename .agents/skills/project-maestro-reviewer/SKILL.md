---
name: project-maestro-reviewer
description: Review, audit, inspect, or assess HudHud FM code, architecture, UI, playback, Firebase, web, tests, or documentation without modifying project files. Use for evidence-backed findings and risk analysis rather than implementation; retain the dedicated hudhud-ecc-review workflow for requested ECC or PL-card acceptance reviews.
---

# HudHud Project Maestro Reviewer

Adapted from Groshe's project-maestro-reviewer workflow for this repository.
Produce prioritized findings supported by source and observable behavior. This
skill does not start a Maestro runtime or automatically delegate review.

## Read-only boundary

Do not edit, create, delete, rename, format, stage, or commit project files. Do not
run fixers, dependency updates, code generation, snapshot updates, or external/data
mutations. Safe analysis/tests may create disposable caches or build output only
when tracked files and external state remain unchanged; inspect command side
effects and compare Git status before and after. Report findings in the response.

Classify the complete request. For review-only work, recommend fixes. If the user
also authorizes scoped improvements, use `project-maestro-implementer` for those
changes outside Plan mode; do not require a separate task or repeated permission.
This skill does not supply missing authorization.

## Load context progressively

Locate `hudhud_fm` from the task context, confirm its Git root from inside the
repository, and check its package name in `pubspec.yaml`. All repository paths
below are relative to that root. Stay within this project and do not inspect the
sibling legacy Android codebase.

Read `AGENTS.md`, `docs/README.md`, applicable nested `AGENTS.md` files, and the
contracts/roles relevant to the requested scope. Select role lenses through
`.agents/README.md`; use existing `hudhud-flutter`, `hudhud-web`, or
`hudhud-firebase` skills under `.agents/skills/` for component-specific guidance
while retaining this read-only boundary. Do not import Groshe-specific contracts.

## Review workflow

`Scope -> Map -> Trace -> Validate evidence -> Prioritize -> Recommend -> Report`

### Scope and comparison

- Identify a narrow, flow-level, documentation, diff, or project-wide review.
  State inspected behaviors/files and important exclusions; do not expand a
  narrow review into an entire platform audit.
- Capture `git status --short`. For patch/branch/PR reviews, establish the actual
  base and target commits or base plus working-tree state. Record whether the
  comparison uses merge base or direct endpoints; do not guess a default branch.
- Define staged, unstaged, and untracked coverage. Separate unrelated user work.
  Attribute a regression only with evidence from the comparison; label existing
  defects separately. If the base is missing, continue independent inspection and
  mark regression attribution unverified until the reference is resolved.

### Map and trace

Trace input -> transformation -> state -> local/remote call -> output -> failure.
Inspect callers and tests, including producers and consumers across components
when they participate in the requested behavior. Relevant HudHud lenses include:

- Flutter layering, Riverpod ownership/disposal, cache/refresh concurrency, and
  ARB/RTL/accessibility under the architecture and product UX contracts.
- The shared audio player, serialized source/seek operations, stale completions,
  retries, sleep timer, background eligibility, and interruption behavior under
  `docs/contracts/playback-contract.md`.
- Firebase mappings, Rules, server-owned writes, root selection, shared Auth,
  moderation, and notification payloads under the Firebase/security and affected
  feature contracts. Use fixtures matching real producer shapes.
- Admin/public React flows and permissions under their nested instructions;
  frontend visibility does not prove server authorization.
- Documentation authority, code drift, broken paths, duplication, and historical
  acceptance evidence presented as current proof.

Never quote secrets, user data, stream URLs, raw payloads, or Firebase environment
files as evidence. Use sanitized behavior descriptions and source locations.

### Validate and prioritize

Each actionable finding needs a precise file/line or symbol, trigger and observed
consequence, realistic impact, priority, smallest safe recommendation, and relevant
test gap. Look for mitigating code before declaring a defect. Separate reproduced
behavior, source inference, likely risk, assumptions, and missing information.

- P0: urgent, critical impact with established reachability; use sparingly.
- P1: high-impact defect with a credible production path.
- P2: meaningful correctness, performance, accessibility, maintainability, or
  test gap tied to a concrete failure scenario.
- P3: low-risk polish or cleanup relevant to the requested review.

Do not manufacture findings or treat a style preference as a bug. Remove duplicates
and calibrate severity from impact and reachability, not keywords.

## Verification and completion

Select checks from `docs/contracts/quality-release-contract.md` and the matrix in
`docs/operations/codex-workspace-setup.md`, confirming current package scripts and
toolchain constraints. Run only checks compatible with review-only scope; report
required gates that cannot safely run instead of changing configuration to pass.
For documentation, governance and diff checks complement semantic/path inspection.

Preserve exit codes and separate failures, warnings, skipped checks, and historical
evidence. Unit/emulator/build success does not establish real-device audio,
production delivery, or release readiness. Check staged/unstaged/new-file status
after verification and disclose meaningful side effects or limitations.

Before reporting, recheck findings against source, callers, and tests. A review does
not close implementation cards or authorize release. Report change readiness
separately from findings. Roles do not grant permission to spawn subagents; claim
independent review only when a separate reviewer actually performed it.

## Report

Use `Summary:`, `Files changed:`, `Verification:`, and `Notes:` unless the user
requests a different format. Put findings in priority order in Summary, including
evidence, impact, recommendation, and test gap; state explicitly when no actionable
findings were found. Files changed should say none for review-only work. Identify
inspected scope, checks/results, residual risks, and unverified boundaries.
For a broad audit, add a concise project map and supported next actions only when
they help assess the findings; report size is not a quality target.
