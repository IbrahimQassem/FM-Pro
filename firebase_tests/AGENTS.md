# Firebase emulator test instructions

Read root AGENTS.md, the data/security contracts and the relevant root package script.
Keep tests isolated in demo emulator projects; never point fixtures at live roots or
use real accounts. Cover guest, owner, forged identity, non-admin and admin outcomes
for changed authorization, plus retries/concurrency when relevant.

Use the existing Node test runner and emulator harness. Preserve fixture cleanup and
explicit environment checks. Run the matching root `emulators:*` script; do not start
an ad hoc production client when an emulator dependency is unavailable. Report the
missing dependency instead. Use the supported Node 22 environment.

