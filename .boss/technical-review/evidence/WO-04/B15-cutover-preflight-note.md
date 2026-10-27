# B15 read-only cutover preflight

Proposed patch: `/tmp/hudhud-b15-cutover-contracts.patch`.

| State | New count events/replay | New count-affecting manual/status/delete |
| --- | --- | --- |
| Absent root / no accepted baseline | Retry; no guessed arithmetic | Atomic precondition failure; retain unfinished deletion job/barrier |
| Paused/building/expired lease | Retry without acknowledging unfinished work | Reject; scoped verified maintenance staging only |
| Active with accepted exact episode baseline | Fresh desired-minus-prior delta; duplicate/reordered work converges | Same authority commits count/contribution and intended comment mutation together |
| Malformed root or missing/mismatched baseline | Retry/reconciliation conflict | Reject before mutation; no clamp/recount/lazy zero |

Absent-root client published creation and OLD deployed legacy operation stay as
approved. Correct future sequencing isolates old/unowned SDK writers, pauses
clients, enables new code under isolation, completes/verifies the full frozen
baseline, atomically activates native commit lineage, then releases compatible
traffic. Misordering is a safety failure, not a different normal UI flow.
Production support remains refused until real platform isolation is available.
Rollback preserves isolation/pause until compatible authority/rebaseline; never
reopen unsafe old count workers over active ledgers.

Root lease generation is not opaque episode data generation. Existing private
per-episode/accepted-manifest lineage and exact native createTime bind ledger
ownership; never assume root generation equality or subtract one. Fresh
postactivation episode creation atomically installs its canonical zero and empty
baseline with native commit identity. No new collection or mapping service.

Exact owning amendment: Firebase-data contract immediately before **No lost work
during pause**, linked clarification in automation **Comment counts and moderation**,
and ADR0006 append. Existing source evidence is indexed in the JSON preflight.

No application/test source was changed and no E/F/runtime, network, production,
deployment or migration command was run. Patch applicability passed. Independent
review and existing B15 dependencies remain outstanding; no finding is CLOSED.
