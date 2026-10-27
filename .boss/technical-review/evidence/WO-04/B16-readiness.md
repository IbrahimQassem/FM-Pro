# B16 read-only execution-readiness preflight

Status: **NOT STARTED; B15 dependency remains.** No source/test/contract edits, test execution, emulator, Flutter, network send or production operation occurred. This note carries no RED, GREEN or acceptance credit. No platform configuration, environment secret or credential files were read or hashed.

## Registered scope and present files

B16 retains tasks 04-T10, 04-T11, 04-T12 and 02-T11; dependencies remain B07/B08/B15 plus approved C04-TIMEZONE. The 65 tasks, 16 batches, 17 waves, 75 owners and 87-node graph are unchanged.

- Existing notification source/tests: `functions/lib/program-notifications.js`, `functions/lib/notification-delivery.js`, `functions/test/program-notifications.test.js`, `functions/test/notification-delivery.test.js`.
- Existing integration paths: `firestore.rules`, `firestore.indexes.json`, `firebase_tests/firebase-rules/firestore.rules.test.js`, `firebase_tests/firebase-emulators/editorial-comment-counts.test.js`, `docs/operations/background-consistency-migrations.md`. Existing 02-T11 contract paths remain in the batch write set.
- Proposed and still absent: `tool/migrate_program_notification_dates.mjs`, `tool/test/migrate_program_notification_dates.test.mjs`. No current exported migration API/signature or runnable migration test exists; do not invoke/import these absent files as RED.
- I exclusively integrates notification-delivery, Rules/index and other shared paths under the registered locks. No new unowned source dependency is necessary from this inspection.

## Existing behavioral test seam and start boundary

`notifyUpcomingProgramsForRoot({firestore,messaging,root,now})` is exported at `functions/lib/program-notifications.js:103`. The injected date, SDK object and message sender permit a genuine named offset regression using current source: UTC Monday 10:00 with utcOffsetMinutes 0 must not send at 07:00Z and must send at 10:00Z. Current source derives one Yemen time/date for every program and ignores that offset. Author permanent tests against this healthy existing seam before changing it. Include valid endMinute/offset and eligible active parent fixture fields, so a future stricter fixture does not fail on setup rather than the intended timing behavior. Existing tests lacking these newly required fields need explicit compatibility/fixture classification, not hidden behavioral RED credit.

The current source rereads a program, reads its station, constructs payload, then calls a separate `startDelivery` transaction. That leaves the approved schedule/visibility race open. The existing `startDelivery` has no validator parameter yet. Its current boolean return contract supports the accepted narrow optional read-only `validate(tx)` extension: read receipt/program/station/legacy sources before any write, validate current fingerprint/eligibility/relationship, replace the prepared payload on each callback retry, and send only after successful committed start. No send or other external side effect belongs inside the transaction. Preserve default callers in `functions/lib/episode-alerts.js` and `functions/lib/user-management.js`, including broadcasts. Their files need no planned source changes; their existing tests remain required regression gates. Preserve programCompatibility across shared claim replacement only as the already accepted narrow field retention; do not create a generic metadata API.

`functions/index.js:800` already injects actual SDK/messaging and runs the collector after the notifier. Changing scheduler configuration or index.js is not required by the offset policy or registered write set. Keep topic/payload/root identities and shared sender defaults.

## Concrete contract blocker before affected implementation

`docs/contracts/firebase-data-contract.md:1270` defines migration item targetUpdateTime/committedAt as stored timestamps and requires the changed target native commit version to equal those fields. Exact target native metadata is unknown inside the creating transaction, and Firestore REQUEST_TIME/serverTimestamp has millisecond precision rather than guaranteed native create/update precision. B15 already proved that equality unsafe. This accepted wording needs a narrow technical amendment before implementing migration receipt identity.

Recommended correction for separate approval: use the immutable item receipt snapshot.updateTime as the native commit receipt for targets actually changed in that same transaction; use explicit literal observed native identity/version for preserved/no-op targets. A newly created target derives create identity from that same receipt commit; an existing changed target retains its verified original create identity. Operational server timestamps may remain diagnostic, never native identity or guessed future metadata. Require postcommit readback/lost-ACK recovery and conditional restore using exact native versions, including no-op, finer-nanosecond, equal-value ABA and delete/recreate cases. Unknown metadata is never represented as proven null absence. Missing or mismatched receipt identity remains held, without repeating an uncertain write. Preserve SENT/UNKNOWN suppression and original attempts/clocks/backoff; rollback never erases terminal evidence or revives sending. This is a C04-TIMEZONE technical prerequisite, not a new product-policy decision, task or wave. No new service/collection/dependency is needed. This preflight does not amend the contract itself.

## Permissions, collector and indexes

Existing notificationOperations paths fall through default deny at `firestore.rules:428`; Rules must test get/list/create/update/delete across both roots and guest/listener/scoped admin/super-admin/role-only/forged maintenance contexts, including new `program_date_migration_{manifestHash}/items/{index}`. Existing importKeys reads, canonical comments group access and public notification behavior must remain unchanged. No notificationOperations-specific role matrix is currently present in the reviewed Rules fixture.

Current `collectNotificationOperations` queries cleanupAt <= now, limit 20, then deletes all returned operation records. It currently has no document-ID prefix restriction and can erase program compatibility evidence. Accepted B16 requires retaining raw program keys/suppressions/jobs and restricting existing broadcast retention to the disjoint broadcast_ scope, without starvation from held records. There is no operations/cleanupAt composite index in the current index file. Final exact query shape may need a name-range/cleanupAt composite; prove that requirement with actual SDK query/index behavior before adding an index through I. Do not add one speculatively or deploy it. Episode-alert cleanup defaults remain separate.

## Verified available command definitions; not executed

Use the exact existing Node 22 binary via PATH before these commands. Functions package engine is Node 22; root package supports Node >=20 <25.

- Cwd `functions`: `node --test test/program-notifications.test.js test/notification-delivery.test.js` for focused authored RED/GREEN; `npm test` and `npm run lint` for full Functions gates.
- Cwd root: `node --test tool/test/migrate_program_notification_dates.test.mjs` only after that registered test is authored and imports preflight successfully.
- Cwd root, parent E lock only: `npm run emulators:test`, `npm run emulators:editorial`; actual sender defaults also require applicable existing subscription/admin/account gates selected from the real changed candidate.
- Syntax checks/import preflight must precede accepting results. Missing modules/exports, compilation or environment failures, skipped/zero tests and endpoint absence are invalid RED.

The migration tool remains demo-only with owned SDK/custody, encrypted durable backup, exact CAS/resume/conditional rollback, complete preserved V1/V2 receipt decisions and no live FCM. Production quiescence is still unsupported; no operator boolean closes it. Full B16 acceptance requires independent review, exact-candidate integration and the remaining Flutter/browser/physical-device obligations. No finding is CLOSED.
