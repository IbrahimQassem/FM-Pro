# B15 historical replay and read-budget contract review

Status: **APPROVED technical amendment only.** This resolves the identified accepted-replay persistence and bounded work ambiguities before their implementation. It does not approve source, complete a task/finding, or authorize operations.

Independent reviewer: `/root/b10_review`, not the tool author. Reviewed patch `/tmp/hudhud-b15-replay-budget-contracts.patch`, SHA-256 `e916926ac4200ae1b65ccbd38017fd741c5800a36346e3d8f136b4c0cd373fd5`. The earlier draft `2bf3802fcf7a67a0f4a353ad3a4b63c833a2d4fb024b57e57cf15013a5ef1c9d` required precise release receipt shape, deterministic proof digests and enumeration read accounting; the revised patch closes those gaps.

## Technical decision

Accepted replay verifies the immutable historical activation result. Healthy later worker changes to canonical comments, counters or contributions cannot be required to retain preactivation versions. Replay verifies the complete contiguous receipt range, ordered episode proof/inventory identity, historical head proof and complete decreasing predecessor chains. Exact slot-count equality and distinct ordered target keys prevent omitted or forked target histories. It binds the native root/release identity, plan, proof hashes and range at each chunk and final success. A changed release or incomplete proof refuses success. This is explicitly not a fresh recount.

The exact release receipt uses the existing `kind:verify` with `proofKind:release` and empty targets. Its index immediately follows the proof prefix, with explicit empty-prefix arithmetic. The native release receipt version equals the root release version and follows the literal paused barrier. Receipt native time is folded only after observation, avoiding a self-referential digest. Episode/head proof digest seeds, tuples, order and duplicate/omission checks are defined.

Read-only replay may persist a narrowly purpose-bound AEAD local checkpoint through the existing private backup capability. Firestore remains read-only. The checkpoint binds project/root/plan/native release identity, proof bounds/digests, bounded cursor state, predecessor/revision, custody and expiry. An exclusive owned no-follow lock serializes processes; exact predecessor CAS, atomic encrypted publication, file/directory fsync and authenticated readback protect progress. Caller cursors and older authenticated payloads cannot advance the durable head. Ambiguous lock/publication fails closed or restarts verification safely; expiry never grants success or erases evidence.

`maxItems` remains 1..25 logical enumerations or empty transitions. Fixed admission/source/head/receipt CAS rereads for the same item do not consume another logical unit, so a one-unit invocation can progress. They are capped at 16 point reads per attempt, with explicit `maxAttempts:3`, no variable ancestry walk hidden as fixed reads, and worst-case precharge before dispatch. The 1536 ceiling accounts for at most 75 enumeration, 1200 CAS, 192 control and 32 other application-issued read equivalents, leaving 37 reserve without creating another work budget. It measures application-issued reads and visible transaction callback attempts, not hidden gRPC retries, billing or index-entry charges. Empty scoped legacy-ledger preflight may use a charged limit-one admission query; a positive result refuses, and an empty result exhausts that exact scope.

## Preserved safeguards and implementation gates

Before-activation complete frozen source/union verification, native barrier, exclusive guarded writer isolation and backup custody remain unchanged. Conditional restore still requires fresh current target identity/version/postimages; later ordinary worker changes may correctly block restore even when historical replay passes. Production isolation/apply/restore remains unsupported. The existing exported demo API is sufficient; no CLI parser, key loader, generic service, dependency or collection is required, and direct CLI mutation may refuse safely.

Implementation must add regression tests for more than 25 historical proof records across fresh processes, a genuinely progressing `maxItems:1` run, current worker mutation after release, exact proof exhaustion, caller/old checkpoint rejection, durable publication ambiguity and custody expiry, omitted/duplicated/forked proof chains, release identity drift, cap exhaustion and visible retry accounting. Missing exports or setup/compilation failures are not behavioral RED. Applicable unit and actual SDK gates plus a separate independent source review remain mandatory. Full 04-T09, B15 and R12 remain OPEN; B16 source remains dependent on B15.

Integration may change only pending-review status labels to accepted technical contract with this review reference and normalize English word/number spacing. Preserve every semantic safeguard and original patch hash. No repository application source/test, emulator, migration or production operation was modified or run by this review. Input fingerprints are recorded in `evidence/WO-04/B15-replay-budget-contract-review-provenance.json`.


## Accepted integration fingerprints

The accepted-status integration patch is `/tmp/hudhud-b15-replay-budget-contracts-accepted.patch`, SHA-256 `076a9234b9ad0187c5befb93cfae155f4bc00a051a5be7ed792102e8cfe83b96`. Independent comparison with the approved proposal confirms only permitted status/review-reference and spacing changes. Current integrated document SHA-256 values follow; original proposal/input fingerprints remain preserved in provenance.

- `docs/contracts/firebase-data-contract.md`: `8c4f89738492efff98cef7c238d696fda330e105d3fa8e028ec29be7c252c7d3`.
- `docs/operations/background-consistency-migrations.md`: `675d795dbbd4f274e9c17308bc595817ae7653df721e17a7885f55089ff70b2c`.
- `docs/decisions/0006-background-consistency-and-schedule-timezones.md`: `ccfb95de9bd890e9c7b267118760dbac6295525b902d1143175e85aa9d717fa4`.
