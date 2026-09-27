# HudHud AI workflow and evaluation

Scope: Codex and Gemini working on HudHud. Added 2026-09-27 after reviewing the
local ECC checkout at `/Users/ibrahimqassem/VisualCodeProjects/ecc`, revision
`e482e579415fde18357cafce70f177ae19fd7f03`. Its existing `yarn.lock` edit was untouched.

Objective: more correct first submissions, fewer user corrections and less repeated
exploration. Speed and token cost are secondary to acceptance and preserved behavior.
This changes shared project guidance; no measured improvement is claimed yet.

Setup validation: governance and diff checks passed; all 11 existing Codex/Gemini
hook tests passed; local documentation links resolved; Gemini's configuration
still lists both shared entry files. This verifies the setup, not model performance
or discovery in a newly launched interactive session.

## Daily workflow

1. **Frame.** For substantial work, capture the requested outcome and observable
   acceptance checks. Keep ordinary small fixes lightweight. A UI brief should carry
   the requested Arabic/English, RTL, light/dark, mascot and platform requirements;
   store artwork also needs the requested named Apple/Android device presentation.
2. **Retrieve.** Start with the documentation map and relevant component instructions,
   then search file names/symbols. Read the implementation and dependency chain needed
   to resolve actual gaps. Avoid loading every role, skill or historical plan. Keep
   useful evidence across the task; reread when files change or an assumption is stale.
3. **Implement.** Reuse existing components and helpers, choose a small coherent
   change, and check it against the brief. Follow the current authorization and
   existing architecture. Tools and skills are selected by need, not availability.
4. **Verify.** Use the existing component gates in the
   [workspace matrix](codex-workspace-setup.md#toolchain-and-verification-matrix).
   For a defect, check the triggering behavior. For a UI, inspect the actual render
   and relevant variants. Fix relevant failures and retain command exit status.
5. **Retain.** When handing off substantial unfinished work, update its existing
   planning/handoff artifact. Record observed facts and open work without duplicating
   the contracts. A later session validates the note against current source.

Use the following compact handoff only when continuity needs it:

```text
Outcome and user constraints:
Baseline commit and pre-existing edits:
Changed files and current behavior:
Evidence: command / result / applicable revision
Remaining work and next action:
Decisions or assumptions needing resolution:
```

Save a reusable lesson only after checking its cause. Put it in the existing owning
skill or contract, with evidence or a regression check where appropriate. Do not
promote one failed command, an unverified suggestion or copied memory to a universal
rule. No automatic transcript collection or extra memory service is needed here.

## ECC selection and compatibility

| ECC source at the reviewed revision | HudHud use |
| --- | --- |
| `skills/search-first` | Search existing project solutions before adding code or dependencies |
| `skills/iterative-retrieval` | Refine context searches to fill concrete gaps; no fixed file-count or three-pass stopping rule |
| `skills/strategic-compact` | Preserve a useful handoff at phase boundaries; native compaction remains client-owned |
| `skills/unified-memory` | Revalidate recalled evidence and retain handoffs in existing project documents |
| `skills/eval-harness` | Predeclare acceptance and compare results on fixed tasks |
| `skills/verification-loop`, `agents/code-reviewer` | Existing [review skill and pilot](ecc-pilot.md) |

Source references are relative to the local ECC checkout; the same files are
available in the [pinned source tree](https://github.com/affaan-m/ECC/tree/e482e579415fde18357cafce70f177ae19fd7f03).
These adaptations retain ECC's [MIT notice](../../.agents/skills/hudhud-ecc-review/LICENSE).

Reasons not to import the whole setup:

- `docs/token-optimization.md` contains Claude-specific model and environment
  settings. They are not configuration instructions for Codex or Gemini.
- `hooks/codex-hooks.json` projects SessionStart, not the complete Claude learning
  hook pipeline. A plugin install would not establish equivalent learning in both clients.
- `scripts/harness-audit.js` consumer checks reward `.claude` configuration and
  recognize `docs/adr`, but miss HudHud's existing `docs/decisions` memory. Its score
  is an inventory heuristic, not evidence that AI output improved.
- The execution gate in `docs/architecture/eval-harness-frameworks.md` is explicitly
  unavailable; `scripts/lib/eval-harness/gate.js` refuses candidate execution.
  Evaluation guidance remains useful, but no automatic optimizer is installed.

The existing focused skills, hooks, model choices and permissions remain in place.
These instructions add no autonomous delegation. A list of installed skills is not
a measurement of loaded context or proof that any particular tool was invoked.

## Evaluate improvement

Status: **protocol prepared; comparative model runs not performed**. The earlier
PL-03 probe established an application defect, not an AI-performance benchmark.

Compare the prior shared guidance (baseline) with the updated guidance (candidate)
on the same frozen task inputs and source snapshot. Preserve current uncommitted
work; use separate scratch checkouts for evaluation, never reset the working tree.
Use a fresh session per task/variant and hold model, reasoning setting, tools,
permissions and budget constant within each client. Evaluate Codex and Gemini
separately. Do not show a prior solution or grading answers to the implementation
session. Begin with representative tasks, not a synthetic configuration score:

| Task family | Acceptance evidence |
| --- | --- |
| Flutter behavior fix | Reproduction resolved; existing state management, localization and relevant tests preserved |
| Admin/Firebase change | Producer/consumer contract and both-root emulator cases pass, including relevant denial/retry cases |
| UI enhancement | Human visual review plus rendered Arabic/English and light/dark variants; requested device/store constraints satisfied |
| Clean patch review | No invented defects; any reported issue has a concrete trigger and evidence |
| Interrupted task resume | Retains user constraints, detects changed source and continues the next required action |

Choose concrete task prompts, fixtures and graders before running either variant.
Use multiple fresh trials for noisy results; report counts and individual outcomes
instead of treating a single success as reliable general improvement. Do not count
repeated execution of the same test as independent AI attempts.

Record one row per run in the task's evaluation report:

```text
task | client/model/settings | source+guidance revision | variant | trial |
first-submission acceptance | corrections | regression result |
elapsed time | input/output tokens if exposed | evidence
```

Define first-submission acceptance as meeting the frozen criteria at the first
completion handed back to the user; internal test-and-fix cycles still belong to
that attempt. Count subsequent required corrections separately. Record unavailable
token/billing data as unavailable; source byte counts are not billed tokens.
Use deterministic checks for behavior and human judgement for visual quality.

Retain a change when comparable trials show better acceptance or less rework
without new regressions or a material time/cost penalty. If evidence is mixed,
report it and narrow the change. Do not lower model quality or add agents solely
to chase a token target. Runtime trust/discovery checks and governance checks are
setup evidence, not measurements of AI task performance.
