# B16 / 04-T12 native verification readiness

Status: read-only readiness review. No application files, tests, Rules, indexes or runtime state were changed. No emulator, Flutter, provider, production or network operation ran. All R01–R13 remain OPEN. T11 is still being authored under `/tmp/hudhud-b16-t11`; its current API is provisional until its frozen implementation has independent review and parent integration.

## Prerequisites and ownership

04-T12 waits for the approved T05/T07/T08/T11 source handoffs and WO-01/WO-03 Rules/index handoffs. T10 already has independently reviewed local Functions evidence; model transactions are not native contention evidence. T11's current model/tool checks are new-tool GREEN, not additional defect RED. W04-W6-CODE is explicitly GUARD-only; retain the genuine earlier count and timing RED evidence instead of breaking existing deny rules.

Parent I remains the only live writer of these registered paths:

- `firebase_tests/firebase-emulators/editorial-comment-counts.test.js`
- `firebase_tests/firebase-rules/firestore.rules.test.js`
- `firestore.rules`
- `firestore.indexes.json` only if an implemented query needs a missing index.

Specialists may prepare patches in `/tmp`, then independent review precedes I integration. Do not add a new harness, dependency, public collection, scheduler export or unregistered fixture. Do not expand the runner's callable whitelist merely to invoke the notifier: the existing function can use real SDK persistence and an in-memory synthetic `messaging.send` collector. This proves application transaction behavior, not live FCM or a deployed scheduler.

## Minimal fixture insertion points

`firebase_tests/firebase-emulators/editorial-comment-counts.test.js` already imports real Admin SDK classes, client Rules SDKs, native count tooling and private temporary backup primitives. Its `before` creates the primary `demo-hudhud-editorial` SDK and Rules environment. Existing native tool cases demonstrate isolated owned SDK factories and cleanup; reuse the established patterns without changing their assertions.

Insert new notifier/cutover cases before the final serialized primary-project count checkpoint, currently introduced by the comment at line985 (`Only real registered callbacks ...`). Keep that final nonempty count activation/worker journey last, and preserve its original no-manual-counter-substitution assertions. New notification fixtures need synthetic stations/programs only, so they should not contaminate the canonical episode inventory. Use random IDs and explicit per-test cleanup of only their own synthetic paths; never broad-delete a root.

`firebase_tests/firebase-rules/firestore.rules.test.js` currently ends with the M04 private count-fence and canonical bounded-audit guards. Append a separate B16 private-state role matrix after those cases, using the existing `seed`, `anonymousDb`, `userDb`, `assertFails` and `assertSucceeds` helpers. The file's `beforeEach` resets its own demo state. Keep public read/authorized workflow positive controls in the same test so disconnected clients or malformed fixture paths cannot masquerade as denial evidence.

The existing isolated runner is `tool/run-count-emulator-tests.mjs`, entered by `npm run emulators:editorial`. It discovers `editorial-*.test.js` serially and exports actual moderation/count workers. It stages a temporary config and forwards no developer credentials or provider secrets. Do not revert to the live project config or launch Official apps.

## Native gap matrix

| Area | Required executable proof after T11 integration | Limits / failure condition |
|---|---|---|
| T10 local schedule and V2 occurrence | In both roots, call actual `notifyUpcomingProgramsForRoot` with real Firestore, explicit synthetic instant, captured synthetic sends: UTC offset0 Monday10:00 does not send07:00Z and sends10:00Z; include a negative offset, +840/+345 and local date/weekday boundary. Check exact V2 key, fingerprint and conditional policy/date stamp. | Do not claim real provider delivery. Valid tests must invoke the existing function and assert captured count/payload, not duplicate its decision logic. |
| T10 native contention | Concurrent actual calls for the same synthetic occurrence yield at most one captured send and one terminal intent. Preserve sent/unknown suppression across another call. | Use actual SDK `runTransaction`; a serial model adapter is insufficient. Do not claim exactly-once transport. |
| T10 final source revalidation | Fired storage-only hook changes schedule/visibility/station binding, or deletes/recreates an identical program/station before the real start transaction reads; verify no stale send. A retry case verifies the payload matches the successfully committed source snapshot. | Assert hook fired and native create/update version actually changed. Avoid awaiting an external write blocked by a transaction-held pessimistic lock. Arrange edits before the start read or use bounded independent native contention. A timeout is not business RED. |
| T10 post-send stamp | Captured-send hook deletes/recreates or changes the program before conditional stamp; assert no resurrection, no stale stamp and no duplicate summary count. | Capture only a synthetic message; no provider call. |
| T11 real owned factory and encrypted backup | Use frozen public factory and actual temporary private backup store, both roots. Verify preview is read-only, apply creates only exact authorized V2/job/items, and no program/station/V1/stamp is rewritten. Preserve source and target native metadata. | A fake verified flag or borrowed arbitrary Firestore object is not the owned SDK capability. Keep encryption keys out of logs and IPC output. |
| T11 immutable native items | Created suppression and carries: item snapshot.updateTime equals changed target native updateTime; absent target birth equals the same commit. Existing-target strengthening retains original createTime. Preserved terminal true-noop keeps both original target versions, distinct from later item receipt time. Absent clear-noop remains absent. | REQUEST_TIME/serverTimestamp is not exact native commit metadata. Assert nanoseconds, not millisecond equality. Do not force a write merely to manufacture a changed receipt. |
| T11 commit acknowledgement loss | Inject a fired error after the real item commit; cold reopen verified backup/SDK and resume. Verify immutable receipt identity, exact target proof and frozen committed prefix before advancing. No second target application or receipt overwrite. | A thrown error before a transaction commits is not unknown-ACK evidence. Record injected phase and native before/after versions. |
| T11 conflict and custody guards | Actual source/target/receipt edit-and-restore ABA, delete/recreate, missing item, wrong prefix, wrong reviewed hash/root/project/owner, expired lease/backup and private-store mode/custody refusal. Verify fail-closed and no unauthorized next write. | Same-body set can be a native no-op; assert metadata changed or mutate then restore. Missing/changed receipts must never be adopted. No public fake clock callback or operator override. |
| T11 bounds and state matrix | Bounded25-item chunk plus next cursor and max31-day range; native sent/unknown, live claim, retryable/backoff/expiry, historical missing evidence, ambiguous overlapping Yemen dates and carry clock preservation. | Retain terminal suppression, original attempts/clocks and conservative uncertainty. A new-tool guard can pass initially; do not claim new RED absent a genuine baseline business failure. |
| T11 rollback | After full and partial apply, native verified rollback reaches `rollback-held`, retains terminal V2 and immutable evidence, and does not delete/retry/resurrect a target/program or rewrite V1/stamps. Changed source/native target proof rejects rollback. | This is intentionally non-erasing verification/hold, not a force rollback or production rollback rehearsal. |
| T12 collector query | Execute the actual `collectNotificationOperations` against native SDK fixtures: >20 eligible expired broadcasts, fresh broadcasts, expired raw program sent/unknown, migration jobs and item proofs. Verify20 bound/progress and exact cutoff while retaining all non-broadcast evidence. | The query's `__name__` prefix inequalities plus `cleanupAt` inequality/order need actual SDK acceptance. Emulator success does not establish deployed composite-index readiness or billing/read cost. |
| T12 private permissions | Both roots plus unknown root; guest, verified listener/owner/other, unverified, scoped station admin, moderator, legacy admin, explicit super-admin, role-only and forged maintenance claims. Deny get/list/create/update/delete of health checkpoint, count root/baseline/ledger/plan/units, RSS repair job/receipt and actual notification operation/migration job/item. Deny direct episode-count writes. | Client SDK claims must not bypass Rules even when named admin. Server Admin SDK bypasses Rules and instead needs explicit root/capability checks. Keep positive canonical public/read and allowed workflow controls. |

## Exact index review

Current T10 collector is in `functions/lib/program-notifications.js`:

```text
collection(root/notificationOperations/operations)
where(__name__, >=, broadcast_)
where(__name__, <, broadcast`)
where(cleanupAt, <=, cutoff)
orderBy(cleanupAt ASC)
orderBy(__name__ ASC)
limit(20)
```

`firestore.indexes.json` currently contains no `notificationOperations` composite. That absence alone is not proof that a new index is required, because Firestore's automatic indexes include document-name ordering. Execute the exact query and inspect the query's index requirements before adding an additive definition. Do not weaken prefix selection or delete raw program evidence to avoid an error. If the Emulator accepts a query without enforcing production composite requirements, record that limitation; production readiness stays a later authorized checkpoint. Never infer an actually deployed index from a local JSON declaration. Other current B16 queries are single `isActive == true` or document-ID pagination/direct reads; review the frozen T11 executor for newly introduced query shapes before finalizing.

## Original17 acceptance obligations

The exact identities remain in `WO-03.md`, section5. Preserve all17, even though ordinary `web_admin npm test` skips emulator-dependent files. Native admin execution uses the existing registered runner and real moderation/count exports:

1. admin-images: real admin image callable re-encodes files in Storage, isolates roots and keeps SDK writes closed.
2. admin-images: real image callable rejects authenticated non-admin and forged actor data.
3. admin-images: real image callable rejects foreign ownership and global media for station admins.
4. batch-import: batch import against emulator: creates programs and episodes, increments counters, and handles unchanged re-imports as no-ops.
5. editorial-queries: editorial aggregates respect expiry boundaries, activation and explicit null schedules in both roots.
6. episode-deletion: episode deletion is retryable, root-scoped and decrements counters once.
7. location-relations: trusted location saves update off-page stations, serialize identity and reject stale reference selection.
8. moderation-authorization: station_admin: real callable enforces station scope and reserves account disabling for super admins.
9. moderation-authorization: moderator: real callable enforces station scope and reserves account disabling for super admins.
10. pl03-moderation: HudHudDev: new comment journey.
11. pl03-moderation: HudHudDev: corrected counter control.
12. pl03-moderation: HudHudOfficial: new comment journey.
13. pl03-moderation: HudHudOfficial: corrected counter control.
14. program-transfer: trusted program transfer includes off-page children, races safely with creation and rejects overflow.
15. review-report: concurrent moderation resolves off-page reports and decrements once.
16. save-authorization: real callable rejects unauthenticated callers and cross-station takeover, and permits own-station edits.
17. save-content: actual save transaction preserves retry counters, rejects stale edits and moves atomically in both roots.

Use the literal declarations/table when mechanically matching; the list above supplies file and identity traceability, not a new name registry. For10/12, manually corrected counters or directly called helper handlers cannot replace the real registered new-comment journey. Keep prior43 actual admin results as historical scoped evidence; rerun affected gates on the final candidate.

## Commands, locks and acceptance sequence

Pin Node22.23.3 by prepending `/Users/ibrahimqassem/.npm/_npx/52027bd8fc0022aa/node_modules/node/bin` to PATH. Use English Boss high-level commands with `--lang en` wherever supported; runtime low-level artifact commands have no language flag.

1. Freeze/review T11 source, tests and append-only ops proposal; parent applies only approved registered paths. Record exact input hashes and `git diff --check`. Preserve accepted count appendices and all historical failures.
2. Create native and Rules guard tests in the existing registered fixture paths. Validate discovery and independent fixture/source review before runtime. Missing imports, missing APIs, compilation, zero tests, skips or setup failures earn no RED/GREEN credit. Existing default-deny guards should pass at baseline.
3. Parent alone acquires E-RUNTIME for all emulator commands, one at a time. Do not run competing demo state/ports, Official applications or long-lived dev servers. Commands at project root: `npm run emulators:test`, `npm run emulators:editorial`, `npm run emulators:admin`, `npm run emulators:account-deletion`, `npm run emulators:subscriptions`. Full editorial discovery includes existing long count proofs and new B16 cases; record candidate input hashes before running and compare them at completion. Loopback startup may require the established sandbox escalation.
4. Root tooling: `node --test tool/test/migrate_program_notification_dates.test.mjs` plus applicable existing count/privacy/RSS/pagination/producer tool tests. Functions cwd: `npm test`, `npm run lint`. New tool APIs must be import-safe. Reuse historical evidence only when its exact inputs and scope remain unchanged; never combine different candidates into a fictional full pass.
5. WO-04 T13 independent exact-candidate QA and T14 independent code review remain separate checkpoints, after integrated GREEN. Retain all65tasks/16batches/17waves,76 ownership paths and acyclic dependency verification. Task implementation availability is not finding closure.
6. G-INTEGRATION retains applicable admin/public web tests/lint/types/builds, final full Flutter tests/analyze and actual browser/physical Android/iPhone acceptance. Existing397 Flutter tests and debug/simulator builds do not satisfy physical notification/audio/background/Bluetooth acceptance. Browser debugger and zero-device blockers remain visible; no waiver is inferred.
7. Separate code completion from any later production migration/deployment approval. All production mutation/activation must currently refuse because deployed isolation is unsupported. No provider sends, index deployment, live migration, production data operation or protected merge is part of this readiness work.

Readiness result: fixture paths and commands exist and are registered. T12 execution can begin only after T11 frozen source approval/integration; native cases and exact index review remain outstanding. No acceptance or finding closure is claimed.
