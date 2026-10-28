---
name: project-maestro-implementer
description: Implement authorized code, documentation, tooling, and configuration changes in HudHud FM with contract-driven inspection, focused verification, and diff review. Use for changes or review-and-improve requests across Flutter, web, and Firebase; exclude review-only requests and do not execute changes in Plan mode.
---

# HudHud Project Maestro Implementer

Adapted from Groshe's project-maestro-implementer workflow for this repository.
This is a project skill, not a Maestro runtime or permission to delegate.

## Load context progressively

Locate `hudhud_fm` from the task context and confirm its root with
`git rev-parse --show-toplevel` from inside the repository. Confirm `pubspec.yaml`
names `hudhud_fm`. All repository paths below are relative to that root; do not
apply this workflow to the sibling legacy Android project.

Read `AGENTS.md` and `docs/README.md`, then only the applicable contracts and
component `AGENTS.md` files. Use `.agents/README.md` to select relevant role lenses.
Source, callers, and tests establish actual behavior; surface contract conflicts
instead of silently choosing one. Do not import Groshe's contracts or dependencies.

Use the existing component workflows when relevant:

- Flutter: `.agents/skills/hudhud-flutter/SKILL.md`.
- Admin or public web: `.agents/skills/hudhud-web/SKILL.md`.
- Functions, Rules, data, auth, or seed tools: `.agents/skills/hudhud-firebase/SKILL.md`.

## Workflow

`Understand -> Inspect -> Plan -> Implement -> Verify -> Review diff -> Report`

1. Identify the requested outcome, acceptance evidence, affected components, and
   unresolved assumptions. Use a safe interpretation for low-risk ambiguity; ask
   only for a missing decision that blocks the scoped work.
2. Capture `git status --short`. Inspect the relevant source, callers, tests, and
   existing patterns before editing. Trace shared fields from their producer
   through storage and Rules to each affected consumer.
3. For substantial work, state a short plan with intended files, verification,
   and stop conditions. Preserve unrelated user changes and avoid cleanup outside
   the request. Plan mode permits inspection and planning, not implementation.
4. Apply the smallest patch that solves the root problem. Match the affected
   component's architecture and naming; add abstractions or dependencies only
   when justified by the requested behavior.
5. Verify using the owning contracts and the component matrix below. Review the
   complete final patch, including newly created files, before reporting.

## HudHud boundaries

- Flutter uses Riverpod for state and DI, with `presentation -> domain <- data`;
  `lib/app/providers.dart` composes dependencies and lifecycles. Keep direct
  Firebase/audio access out of Widgets and controllers, behind data boundaries.
- Preserve the shared player for live stations and recorded episodes. For audio
  work, read `docs/contracts/playback-contract.md` and inspect load/seek ordering,
  cancellation, retry budgets, sleep timers, disposal, and platform eligibility.
- Keep cache-first/server-refresh behavior and existing navigation. User-facing
  Flutter strings belong in ARB; verify Arabic/RTL, semantics, and large text.
- Web components follow their nested instructions, not Flutter state conventions.
  Preserve existing admin/public routes, claims, and selected-root checks.
- For shared data, read `docs/contracts/firebase-data-contract.md` and
  `docs/contracts/security-privacy-contract.md`. Preserve explicit `HudHudDev` and
  `HudHudOfficial` boundaries, shared Auth implications, and server-owned writes.
- Do not expose credentials, user data, stream URLs, raw source errors, or Firebase
  environment file contents. Preserve authentication, validation, and Rules.
- Release, live data changes, signing, deployment, and messaging require their
  applicable contracts and authorization. Check existing session authorization;
  do not repeat permission requests already resolved or infer authority from tools.

Role files provide review lenses and bounded handoffs, not automatic delegation.
Do not spawn subagents solely because several components or roles are involved.

## Verification

Use `docs/contracts/quality-release-contract.md` and the toolchain/verification
matrix in `docs/operations/codex-workspace-setup.md`; inspect current package
scripts before selecting commands. Load feature-specific gates only when affected.

- Documentation/skills-only work: `./tool/verify-governance.sh`,
  `git diff --check`, and semantic/path validation. Validate changed skill
  frontmatter and UI metadata with the available skill validator when possible.
- Flutter: required formatting, analysis, tests, and Android build gates; add iOS
  and manual checks when platform/playback impact requires them.
- Web/Firebase: target lint, build, existing tests, and relevant demo emulator
  suites. Use a Node version satisfying package engine constraints. Do not invent
  a test script or substitute live production for an emulator.

Record commands and exit results. Separate failures, warnings, skipped checks,
and pre-existing issues. Builds and emulator tests do not prove physical-device
audio, notification delivery, production readiness, or store acceptance.

## Final diff review and report

Compare initial and final Git status. Inspect staged and unstaged diffs and new
files; check for unrelated edits, sensitive data, generated artifacts, and
accidental contract or dependency changes. Do not stage or commit merely because
this skill was invoked. For long-task handoffs, update the existing task document
as directed by `AGENTS.md`, keeping verified evidence separate from pending work.

Report concisely using `Summary:`, `Files changed:`, `Verification:`, and `Notes:`.
Include what changed, exact paths, checks/results, and material assumptions or
unverified behavior. Do not claim independent review for your own diff review.
