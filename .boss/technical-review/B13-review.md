# B13 independent technical and security review

Date: 2026-10-26. Reviewer: independent `b10_review` agent; no implementation authorship.

## Verdict

**REVISION_NEEDED. B13 handoff is BLOCKED.** RSS behavior and ordinary tests pass, but repair-tool security and rollback safeguards have reproducible gaps. R09 remains OPEN. No production access, migration, deployment or source modification was performed by this reviewer.

## Blocking findings

1. **High — transport and durable-backup claims are caller assertions.** `tool/repair_rss_urls.mjs:159` accepts any database object whose public projectId matches a demo name and any caller-provided loopback emulatorHost. It does not bind execution to an owned frozen SDK client. At line163 any truthy store with put/get methods is accepted. An in-memory object returning the manifest passes the claimed encrypted durable backup gate. A synthetic untrusted transport plus memory store completed URL and job mutations. Require actual owned SDK loopback binding and an unforgeable, privately configured backup-store capability, with rejection before transactions. Preserve unit injection through a controlled test seam rather than production trust in arbitrary objects.

2. **High — backup validity is not checked at mutation checkpoints.** Backup persistence/readback happens only at line166, outside the lease transaction. Lease creation and subsequent item transactions never revalidate expiry, integrity, custody or directory identity. The second item still commits after the backup expires immediately following the first commit. Require verified immutable backup readback and recovery-window checks inside the initial transaction and each mutation/checkpoint boundary; bind directory identity and reject permission/replacement drift. Add empty-manifest initial-lease, lost/corrupt/expired backup and apply/restore drift tests.

3. **High — rollback ignores applied document version.** At line200 version comparison is conditional on apply; restore checks content fingerprint only. A synthetic same-content write giving the source a newer updateTime still permits rollback to replace its URL. Delete/recreate with identical data has the same gap. Persist atomic per-item applied/restored receipts tied to source commit versions, and compare updateTime as well as complete postimage/parent identity before rollback or replay verification. Require behavioral ABA and delete/recreate tests before correction.

## Reproduction and evidence

Temporary reviewer-only probe file `/tmp/hudhud-b13-independent-probes.mjs` copies the existing synthetic fixture with absolute imports and adds three rejection assertions. Command: Node22 `--test --test-name-pattern='REVIEW:' /tmp/hudhud-b13-independent-probes.mjs`. Result: **3 tests, 0 passed, 3 failed, 0 skipped**, each with `Missing expected rejection.` These are real guard assertion failures after execution, not compilation, missing-module or environment failures. Log: `/tmp/hudhud-b13-independent-probes.log`. The implementation owner must add permanent regression tests, retain their pre-fix failures and rerun GREEN after correction.

Independent ordinary command: Node22 `--test functions/test/rss-ingestion.test.js functions/test/admin-content.test.js tool/test/repair_rss_urls.test.mjs tool/test/backfill_content_identities.test.mjs`: **72 passed, 0 failed, 0 skipped**. Log: `/tmp/hudhud-b13-independent-ordinary.log`. These passing cases do not cover the blocking probes above.

## Other reviewed behavior and obligations

Historical aliases have bounded private proof fields tied to immutable stored external identity and exact root/program/station/target ownership. Raw/decoded collisions, foreign or missing owners and invalid proof fail closed; completed URL backfills still perform bounded GUID lookup. Admin URL edits retain historical reservations. Deletion/transfer can conservatively leave aliases unusable pending reviewed lifecycle integration; the contract correctly states this operational limitation. It must not be presented as automatic cleanup.

The coordinator's first editorial run recorded **60/61 passing** with a transfer failure whose underlying rejection was hidden. The diagnostic-only assertion amendment retains the same success expectation, and its rerun recorded **61/61 passing** without a source fix. No deterministic cause or fix is established. Retain this unexplained instability and diagnostic evidence; do not claim it resolved or introduce speculative locking changes.

Actual both-root, all-client-role Rules denial for private `importKeys` and `rssUrlRepairs` job/receipt paths remains required; Admin SDK fixtures do not prove client permissions. The coordinator owns emulator execution. B15 count-fence integration, final Work Order review, all original skipped-test identities, global Flutter and physical-device obligations remain mandatory. No source acceptance or finding closure follows from this report.

## Reviewed fingerprints

| File | SHA-256 |
|---|---|
| `functions/lib/rss-ingestion.js` | `2872cd619aa20beae29e1ea223468f7a96a315f5e652d272a1e469f9c6a806af` |
| `functions/lib/admin-content-relations.js` | `a7fb618a56426db353c08ea9a238311a0aed01c4331fb18548a2081726d38b58` |
| `functions/test/rss-ingestion.test.js` | `6ee5e0a5e67acf593de2bbc673825f51f9609b618125a42d584ac44f04a08f58` |
| `functions/test/admin-content.test.js` | `19a4602fba970f421ef0b703f87caf572e89a427db853f01886bff4a7c2bb211` |
| `tool/repair_rss_urls.mjs` | `9de8ce79a2a0827c33810b0f4db16009f6cd76503927211af5f8a6bcb6c2fe49` |
| `tool/test/repair_rss_urls.test.mjs` | `a2bdcf13d2705463eb2eebf895dc4dfad0112fe90647cc697d95e13dec9cbb50` |
| `firebase_tests/firebase-emulators/editorial-rss.test.js` | `baef11ffb9b2a85a048db2cf376ed1c8f9339e3f0d5940f2400003639499ffa2` |
| `firebase_tests/firebase-emulators/editorial-audit.test.js` | `cb4c6d0130631ab81ecf52ad8fc23ecb4018da6d1df6a29175e246ab856c6c4e` |
| `docs/contracts/firebase-data-contract.md` | `12ff791d95ba5a5469cbb974973d717172249e73b2c2304fb9a96c5eca168679` |
| `docs/operations/background-consistency-migrations.md` | `1bba67d24a9da7339505e0bcf360ab783d9605a0884ff28301249d91c47a3d8f` |


## Independent correction re-review — 2026-10-26

**APPROVED for demo-only verified interim handoff.** The three HIGH blockers above are verified corrected in this candidate; their historical findings and failed evidence remain intact. This is not R09 closure or approval for production operations.

The actual SDK factory uses public settings once, freezes the facade and keeps transport binding in a private WeakMap. Arbitrary database/project/host assertions are refused before mutation. The backup factory uses private fields, private capability membership, a frozen instance/prototype, immutable ciphertext and directory/file identity checks. Execution requires a pre-persisted backup; it cannot silently recreate a missing file. Authenticated readback, recovery window and custody checks occur inside the initial lease transaction including empty manifests, inside each apply/restore mutation boundary and during final verification.

Schema2 binds source create identity and exact updateTime. Immutable atomic apply/restore receipts share the source commit version. Prefix verification and conditional rollback compare current source create/update identity, full postimage and receipt content. The real SDK fixture exercises an actual two-write ABA transition and delete/recreate; identical no-op writes alone are correctly not treated as a changed-version proof.

Independent Node22 guard command `node --test tool/test/repair_rss_urls.test.mjs tool/test/backfill_content_identities.test.mjs` passed **40/40, zero failures/skips**; retained reviewer output `/tmp/hudhud-b13-rereview.log`. Inspected permanent pre-fix four-assertion RED evidence and the coordinator's corrected real emulator gate: **73/73 passed, zero failures/skips**, successful shutdown. Initial fixture failures from an incorrect permission expectation and no-op ABA setup are explicitly not valid RED evidence or fixed-vulnerability claims.

### Explicit permission-contract reconciliation

**Approved preservation of established reservation reads.** Current and HEAD Rules both allow known-root `importKeys` reads/lists through existing `isAdmin()` (`admin:true` OR role `station_admin`/`super_admin`) and deny all client reservation writes. New alias proof stores hashes and IDs, without raw URLs, GUIDs or personal payloads. Existing web import abstractions reference import-key records; no client-read permission removal or expansion is necessary for R09. The earlier newly authored all-administrator-read-denial statement was inaccurate and is superseded by the corrected data/operations contract. This is a documented scope correction, not remediation of an established permission vulnerability.

The actual fixture covers ten contexts per root: anonymous, ordinary authenticated, listener, role-only moderator, role-only station admin, station admin with admin claim, moderator with admin claim, generic admin claim, role-only super admin and super admin with admin claim. It checks the exact existing reservation read/list policy, denies every reservation create/update/delete, and denies every client get/list/create/update/delete on new repair jobs and both receipt collections. No Rules source changed for this reconciliation.

B15 count-fence integration and affected re-verification remain required. The unexplained original 60/61 transfer run, subsequent diagnostic61/61 and current73/73 remain retained without a cause/fix claim. Full project QA, physical acceptance, separately authorized production operations and finding closure remain outstanding.

| Corrected input | SHA-256 |
|---|---|
| `tool/repair_rss_urls.mjs` | `593600397eaa52e9bc197b5de8efabf465ecc0a41be976800da71c63e971f7b0` |
| `tool/test/repair_rss_urls.test.mjs` | `714c41ba2fc9f49c7876126472a26e859c9444399a26b4c099f708501788a0f3` |
| `firebase_tests/firebase-emulators/editorial-rss.test.js` | `69e81cb9ddec6b95549c01b3ca92431fd9271e4e8d0810e2b6436eb7faaaeac5` |
| `docs/contracts/firebase-data-contract.md` | `aacc82431f9f84d21970fd49e7677853057a32543f98cee45d291a5519b7fe95` |
| `docs/operations/background-consistency-migrations.md` | `2fb8f74b85fe0f42aae584e9f0745cfe82bd2629d30bb1884c97bb283ab4213d` |
| `firestore.rules` | `b792a71572cf2822aa8e74278dea82043fe40a60a67bad29fbc299ba347d58e9` |
| `.boss/technical-review/evidence/WO-04/B13-review-emulator-corrected.log` | `cbb685dbcdacabea601c8586a7bf10c01e93fdc9790386bcc755ebfc070cd68b` |
