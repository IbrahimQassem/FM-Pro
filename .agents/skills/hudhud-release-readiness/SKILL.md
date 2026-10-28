---
name: hudhud-release-readiness
description: Assess or prepare HudHud FM release evidence and Arabic/English release notes for an identified candidate, checking build provenance, environment roots, physical-device acceptance and remaining store gates. Use for release readiness or candidate handoff; it does not itself authorize signing, deployment, messaging or publication.
---

# HudHud release readiness

Locate `hudhud_fm`; paths below are repository-relative. Read `AGENTS.md`,
`docs/README.md`, `.agents/roles/quality-release.md`,
`docs/contracts/quality-release-contract.md`,
`docs/contracts/release-readiness-contract.md`, and
`docs/decisions/0002-store-release-boundaries.md`. Load feature contracts only for
the candidate's changes. Use `docs/release/store-release-execution-plan.md` for
execution scope and `docs/contracts/deployment-mechanism-contract.md` only when
deployment is part of the authorized task.

## Identify the candidate

- Record source commit, staged/unstaged/untracked changes included, version/build
  from `pubspec.yaml` and any build overrides, target platforms and artifact hashes
  when artifacts exist. Do not assume a version label identifies one immutable build.
- Establish the previous shipped baseline from supplied or verified evidence before
  composing change claims. Confirm whether this is first publication or an update;
  mark unavailable store facts Unknown rather than inventing IDs or rollout status.
- Inspect the relevant existing `docs/releases/` validation and handoff records.
  Historical passing checks apply only to their recorded revision/environment;
  reconcile them with the current candidate before reusing evidence.

## Evaluate gates

1. Select commands from the quality contract and
   `docs/operations/codex-workspace-setup.md`, checking current package scripts.
   Record command, candidate revision, environment, exit result and warnings.
   Report Passed / Failed / Not run / Unknown distinctly.
2. Verify root selection and rejection paths using source and safe tests. Development
   acceptance uses `HudHudDev`; a production artifact must target `HudHudOfficial`.
   Shared Auth remains relevant to account deletion and root isolation. Do not read
   Firebase environment files or dump signing credentials to establish evidence.
3. Check applicable physical-device evidence using
   `docs/release/november-2026-device-acceptance.md` or its documented successor.
   A simulator, mocked delivery or server acknowledgement does not prove audible
   background playback, interruption recovery or real notification receipt.
4. Check applicable signing/provider/store configuration, legal links, UGC, privacy,
   approved brand assets and rollback/rollout evidence against the owning contracts.
   Verify external facts only with authorized read access; otherwise mark Unknown.
5. Surface contradictions between contracts, ADRs and implementation as explicit
   decision items. For example, do not infer current upload availability from an
   old deferred-feature statement when a later ADR/source says otherwise. Do not
   silently rewrite product contracts during a readiness assessment.

## Prepare release copy when requested

Use the candidate's existing release directory and format. Keep Arabic and English
equivalent, concise and customer-facing. Tie each claim to the established baseline
and verified availability; do not advertise internal refactors or pending features.
Keep Unknown/Pending evidence in the validation record and unsupported claims out
of publishable copy. A draft does not authorize store submission, FCM or social posts.

## Deliver a bounded verdict

Lead with readiness and blockers, then evidence, untested gates and next actions.
Required Failed/Not run/Unknown gates prevent an overall ready verdict; distinguish
local code readiness from physical-device and production/store readiness. Update
existing handoff/validation files only for authorized preparation; read-only reviews
return findings without editing. Do not bump versions, sign, push, deploy, send or
publish merely because this skill is invoked. Honor action-specific authorization
already granted without requesting it again; preserve unresolved release gates.
