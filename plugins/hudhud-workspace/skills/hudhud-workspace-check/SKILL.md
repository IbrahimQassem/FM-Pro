---
name: hudhud-workspace-check
description: Review cross-component change impact and select or run the existing verification gates in the HudHud FM workspace. Use for workspace readiness or changes spanning Flutter, web and Firebase.
---

# HudHud workspace check

Apply only inside a repository containing pubspec.yaml, web_admin, web_hudhud and
docs/contracts/firebase-data-contract.md. If this is not that repository, do not
apply HudHud rules to another project.

Read the repository's AGENTS.md, docs/README.md and
docs/operations/codex-workspace-setup.md. Inspect git status and changed file names
before reading diffs; exclude secret/config files identified by the security contract.

Map each change to Flutter, admin web, public web, Functions, Rules or seed tooling.
Check cross-component field/route dependencies. Use the verification matrix in the
setup guide and package scripts as executable truth. Run only relevant checks;
never seed, deploy, sign or send messages as an implicit verification step.

Use the repository's focused skills when present; otherwise read the applicable
contracts directly. Do not require another plugin or automatically spawn agents.
Report actual passes, failures, skipped checks and reasons, plus any contract drift.
