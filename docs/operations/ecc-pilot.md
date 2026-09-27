# Selective ECC pilot

This report records the initial review-only trial. The user's broader objective
of improving Codex and Gemini results is covered by the shared
[AI workflow and evaluation](ai-performance.md).

Date: 2026-09-27. Application baseline: `e1a018a` (clean working tree).
Scope: project-local review/verification workflow and PL-03 evidence. Application
behavior, dependencies, agent configuration and production state are unchanged.

## Use and provenance

Invoke `$hudhud-ecc-review` for a roadmap acceptance review, for example:

> Use $hudhud-ecc-review to review PL-03 against its acceptance criteria. Trace the
> actual producers and consumers, run applicable emulator checks, and report
> reproduced defects separately from untested assumptions.

The skill lives in [`.agents/skills/hudhud-ecc-review`](../../.agents/skills/hudhud-ecc-review/SKILL.md).
It is available through repository discovery on the next turn/session opened at
`hudhud_fm`; an existing session can read the file directly. No ECC runtime or
global plugin installation is required. Existing HudHud instructions remain authoritative.

Adapted from [ECC](https://github.com/affaan-m/ECC), pinned to
`e482e579415fde18357cafce70f177ae19fd7f03`:

- [verification-loop](https://github.com/affaan-m/ECC/blob/e482e579415fde18357cafce70f177ae19fd7f03/skills/verification-loop/SKILL.md): scoped verification and explicit results.
- [code-reviewer](https://github.com/affaan-m/ECC/blob/e482e579415fde18357cafce70f177ae19fd7f03/agents/code-reviewer.md): contextual, evidence-backed findings.
- [MIT notice](../../.agents/skills/hudhud-ecc-review/LICENSE) retained with the adaptation.

The official skill installer fetched only `verification-loop` into temporary
staging for inspection. The repository contains the reviewed adaptation, not a
verbatim upstream installation. No upstream executable was run.

Changes from upstream: use HudHud's existing verification matrix and package
scripts; preserve command exit status; allow existing-code findings in an explicit
flow review; distinguish previously known defects. Omit universal coverage/size
thresholds, generic secret-printing commands, mandatory review agents and timed
retesting. Hooks, continuous learning, observation logs and automatic updates are
outside this trial. The upstream package as a whole has not been audited.

## PL-03 result: TD-08 reproduced, still open

Trigger: a verified active listener accepts UGC terms, creates a comment on a new
episode whose comment count is zero, and another listener reports it. The admin
then attempts `commentHidden` through the actual `reviewReport` helper.

The [Flutter producer](../../lib/features/comments/data/datasources/comments_firestore_data_source.dart)
adds the published comment without adjusting the counter (`addComment`, line 113
at the baseline). The [episode template](../../web_admin/lib/admin-resources.ts)
initializes it to zero (line 136). The
[moderation helper](../../web_admin/lib/review-report.ts) requires a valid decrement
before any transaction writes (line 108). The existing
[moderation test](../../web_admin/test/review-report.emulator.test.ts) expects
rejection for zero and manually restores one before exercising successful actions.

The [acceptance probe](../../web_admin/test/pl03-moderation.pilot.ts) uses synthetic
profiles and an episode fixture, normal client writes under the repository's
Firestore Rules, and the actual admin helper. It asserts the desired final state.
Only the diagnostic control manually corrects the counter after comment creation.

| Case | HudHudDev | HudHudOfficial |
| --- | --- | --- |
| New comment → report → hide | FAIL: `ContentError`, comment published, report open, count 0 | Same failure |
| Correct counter to 1 → hide | PASS: hidden, resolved, count 0, guest read denied | Same success |

Both roots here are paths inside `demo-hudhud-ecc-pilot`, never live data.
The probe had **2 passed / 2 failed / 0 skipped**, exit 1. These are product
acceptance failures, not a successful PL-03 completion. The counter control is
diagnostic, not a proposed client-side repair.

Reproduce from the repository root with the supported Node 22 environment active:

```sh
./node_modules/.bin/firebase emulators:exec --only firestore --project demo-hudhud-ecc-pilot 'node --experimental-strip-types --test web_admin/test/pl03-moderation.pilot.ts'
```

This uses the existing Firebase CLI/config harness. The probe refuses a different
project or non-loopback Firestore host before creating clients. It deliberately
uses `.pilot.ts`, outside normal `*.test.ts` discovery: it is an explicit failing
acceptance artifact. When PL-03 is implemented, integrate the journey into the
regular emulator suite and require success; do not invert its assertions.

Limits: equivalent Firestore payloads exercise the Flutter data contract, not the
Flutter widget or Dart runtime. Only hiding was reproduced; removal/disable,
retry/concurrency, quotas, reconciliation and production indexes were not accepted
by this probe. Firestore only was started; source inspection found no comment-create
counter trigger. Authentication/profile provisioning was represented by synthetic
fixtures and emulator claims, not real providers.

Repair remains owned by [PL-03](../roadmap/platform-development-plan.md): trusted
counter ownership, idempotency and reconciliation, with urgent moderation able to
proceed despite counter drift. Preserve audit records, authorization and nonnegative
counts; do not fix this by granting listeners counter writes. Respect PL-01's
dependency before treating the broader moderation flow as release-ready.

## Evaluation and verification

- One previously documented defect reproduced; zero net-new defect claims.
- New evidence: four producer-to-consumer checks, including two passing controls.
- Probe execution: approximately 8.8 seconds, excluding emulator startup and setup.
- Existing `npm run emulators:admin`: 6 passed, 0 failed, 0 skipped (Node 22.23.3,
  demo emulator, exit 0). Its green result does not cover the newly reproduced journey.
- Total work time, token cost, comparative rework and savings: not measured. This
  informed trial is not a blind comparison and cannot prove ECC improves productivity.
- Probe formatter and targeted lint passed. YAML frontmatter parsed successfully
  with Ruby's safe YAML parser; the official Python skill validator could not run
  because this Python environment lacks PyYAML. No project dependency was added.
- Governance, diff whitespace and new documentation link checks passed.
- Device/UI, Flutter builds, production and store checks were not run for this
  tooling-only change. PL-03 remains open.

Before expanding adoption, compare a small set of similar review tasks using
confirmed defects, false positives, rework, elapsed time and token cost where the
runner exposes it. Keep only guidance that adds value over the existing HudHud skills.

## Maintenance and rollback

Review upstream changes before updating the pinned reference or adaptation. No
automatic synchronization is configured. To remove this trial, remove only the new
skill directory, this report, the manual probe and their documentation links. Preserve
the existing skills, hooks, plugin and contracts. No application migration is needed.
