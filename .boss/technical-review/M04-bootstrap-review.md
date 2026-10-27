# M04-T09-BOOTSTRAP-READY independent security review

Date: 2026-10-26. Reviewer: independent `b10_review` agent; no implementation authorship.

## Verdict and scope

**APPROVED for narrow early empty-demo-root bootstrap code/guard preparation.** No blocking issue found in this reviewed scope. This is not full04-T09 reconciliation/restore, completed04-T06/07 producer integration, actual event/worker acceptance, B15 acceptance, production support or finding closure. B16 remains dependent on B15.

The milestone is the registered partial04-T09 output; full04-T09 still follows04-T08. This review does not turn the source module into a general apply/restore CLI or authorize running it against an existing production root. No source/test modifications, E/F process or operation was performed by the reviewer.

## Security and consistency assessment

- Mutation requires the module-owned frozen server SDK facade, public frozen loopback settings, a demo project and private transport binding. Project/host claims, arbitrary facade copies and production names do not authorize writes. Scope/hash and expected manifest are checked before mutation.
- Backup configuration is private and immutable behind a factory capability. Ciphertext uses AES-GCM, immutable exclusive creation, file/directory fsync and authenticated readback, with owner-only custody, inode/device/permission checks, finite retention and one-hour recovery window. Bootstrap requires the pre-persisted reviewed backup; it does not recreate missing evidence. It rechecks trusted transport and backup inside initial pause, inventory, activation and final readback boundaries.
- Read-only oldplanned `comments` collection-group audit uses the private namespace name range and a25-document cap. A zero result is exhausted; any positive result refuses mutation. Collection-group discovery covers orphan leaf documents without requiring an existing episode/baseline ancestor. Canonical comments fall outside the range. No rename/copy/delete is performed.
- Initial transaction checks source root preimage/native versions and refuses an existing episode before acquiring pause. Authoritative empty inventories are then read in two separate transactions under matching paused owner/generation/planHash/lease. An empty limit1 query is an exhausted inventory, not a partial archive count. A later appearing episode invalidates activation. No active fence or corrected counter is hand-seeded by this bootstrap.
- Activation checks the verified zero inventory/digest and advances maintenance epoch atomically with server-timestamp activeFrom and manifest lineage. Final readback compares native updateTime with activeFrom. Repeated acknowledgement of the same completed activation validates that commit identity and backup rather than applying another guessed baseline. Paused interrupted work resumes only the same plan with owned lease/generation checks.
- The dependency-free fence helper distinguishes absent legacy mode from accepted active baseline. New count-aware arithmetic requires active baseline, exact native episode create identity and matching accepted data generation/lineage; it does not invent legacy zero. Moderation checks the fence before external moderation work and in the actual count/status transaction, reads fresh content/status, preserves terminal manual decisions and removes unchecked direct-update fallback. The warning log no longer interpolates provider error detail or comment identifiers/content.

## Verification

Independent Node22 command from repository root:

`node --test tool/test/reconcile_comment_counts.test.mjs functions/test/comment-counts.test.js functions/test/comment-moderation.test.js`

Result: **55 passed,0 failed,0 skipped**; reviewer log `/tmp/hudhud-m04-bootstrap-independent.log`. This includes13 bootstrap guards and42 core/moderation cases. The bootstrap fixtures are a synthetic storage/native-metadata model, not actual emulator execution. They cover both roots, nonempty refusal, capability/production refusal, orphan legacy namespace detection, lost pause acknowledgement, backup loss/corruption/expiry/permission/replacement drift, and episode drift after pause. Do not label model tests as real SDK/emulator evidence.

Original R12 arithmetic RED and later orphan/logging guard RED are separate evidence classes. This reviewer did not rerun or credit a missing-module/environment failure as RED. BE's reported isolated314-test producer candidate is not a combined live-source gate: corresponding producer fixture integration is still pending at this checkpoint. No whole-suite producer handoff is claimed here.

## Remaining acceptance obligations

Coordinator must integrate the matching producer fixture patch, obtain relevant independent producer/core reviews, and run the actual empty bootstrap plus real count/moderation event journey in the demo emulator under existing runtime locks. Include native query/commit/unknown-ack behavior, both-root private Rules denials, paused writer races and no premature acknowledgement. Full nonempty inventory/reconciliation, bounded source/ledger stages, conditional recovery, actual worker/harness integration and all original dependencies remain in full04-T09/B15.

The original17 skipped identities, final exact-candidate Functions/admin/public/Flutter gates and physical-device acceptance remain separate. Production isolation is unsupported; no operator boolean, hand-seeded active state or fake reconciliation substitutes. All findings remain OPEN.

## Reviewed fingerprints

| File | SHA-256 |
|---|---|
| `tool/reconcile_comment_counts.mjs` | `4f199c259826e62c12ba0359dfa58a8bd7d2957766780d422e2f9d24bcfcb1a8` |
| `tool/test/reconcile_comment_counts.test.mjs` | `a586272be2dd074bf82924cdd3c73baf13ba2fc74958dbf6149a217ed61e5faa` |
| `functions/lib/comment-count-maintenance.js` | `1a4f6ab12f8a7bc2dadb8f2ff4966829f8d37df08a028472c20076dcfd0f2d70` |
| `functions/lib/comment-counts.js` | `a1777fb2d1a77296c5489052785ecddaeaf6e03081232342991af28ff54983d5` |
| `functions/lib/comment-moderation.js` | `f2a3e61d94faef6e5d26ed910159832389a1809876052dbda79551821af8225c` |
| `functions/test/comment-counts.test.js` | `9356e53bdc54d641878bfde63b880e8d069efed491141efb08f1b93c56910845` |
| `functions/test/comment-moderation.test.js` | `158fee440b4cc34990c614f98c366ac34a74aa757cb0ec7bbf176594314dfec0` |
| `functions/test/support/comment-count-fixture.js` | `eb5849a849f9a1f38eb1df26bae74a87602e1ef1d2d2ba0efbcd3900f4c5d8d9` |


## Reopened precision hold — supersedes early55-test approval

**BLOCKED BEFORE FIRST USE.** The historical55-passing synthetic tests above remain evidence of their covered guards only. Their original native-metadata model equated REQUEST_TIME with document versions and masked two now-permanent precision failures. They do not establish native SDK/bootstrap readiness. No actual bootstrap/emulator consumption occurred under that approval.

Updated evidence `evidence/WO-04/B15-native-precision-red.log`: **2 executed business assertions fail,0 pass,0 skips**, covering atomic episode birth baseline identity and empty-root activation readback. `B15-bootstrap-blocked-provenance.json` records the current hold and incomplete combined candidate. Official Firestore RPC specifies REQUEST_TIME at millisecond precision; native create/update metadata must be preserved independently. Current source must be corrected, rerun GREEN and independently reviewed before first actual bootstrap use. Contract decision is recorded in B15-native-contract-review.md; contract approval alone does not clear this source hold.


## Corrected native-source independent re-review — 2026-10-26

**APPROVED for narrow early bootstrap code/guard preparation and first coordinator-owned demo validation.** The precision source hold is cleared for the exact candidate below, after the integrated native schema includes both required contribution wording corrections. This supersedes the prior hold for this revised source only. Historical55-model proof and two genuine precision REDs remain retained; neither is retroactively native SDK evidence. No actual bootstrap/E was consumed by this reviewer.

The creation-origin baseline contains no transform-derived episodeCreateTime. Its immutable native snapshot updateTime is checked against canonical episode createTime. Rewrites invalidate creation form; materializeEpisodeCountBaseline resolves the original receipt then returns baseline origin with literal native identity. The conversion helper is not a completed recovery command.

Contribution rows record observed native commentVersion and explicit commentMutation. Their native row version supplies a possible actual mutation receipt; genuine no-op uses observed-before identity. Equality is used only for unchanged fast-path suppression, not admission. Legitimate newer status/delete events recompute desired-minus-prior from fresh canonical state and valid episode/lineage. MaterializeCommentCountContribution verifies original receipt and current identity/contribution, returns commentMutation=false with literal native version, and refuses reinterpretation of rewritten metadata or stale canonical state.

The revised unit model rounds REQUEST_TIME transforms to milliseconds independently of fine native metadata and retains native versions for genuine unchanged document data. Both original precision assertions pass unchanged. Added guards cover mutation/no-op receipts, ordinary newer changes, creation/contribution rewrite conversion, paused native barrier, guarded release, lost acknowledgement, backup corruption before release and changed active proof. First inventory and the second inventory/barrier remain under a paused owned fence; release rereads owner/generation/lease/plan/complete digest/empty catalog and backup, then stores literal native barrierVersion as activeFrom. Readback checks exact bindings and later release metadata. Recovery establishes a fresh verified barrier, and accepted replay is read-only.

Owned frozen demo SDK binding, purpose-bound private durable encrypted backup, per-mutation custody/recovery checks, oldnamespace orphan-leaf detection, source CAS and empty-root refusal remain intact. General nonempty reconciliation, apply/restore CLI and production support are still deliberately absent. No fake full baseline, hand-seeded active fence or operator isolation boolean is accepted by this bootstrap.

### Verification and next gate

Independent Node22 root command:

`node --test functions/test/comment-counts.test.js functions/test/comment-moderation.test.js functions/test/editorial-audit.test.js functions/test/admin-report-review.test.js functions/test/admin-content-delete.test.js functions/test/rss-ingestion.test.js tool/test/reconcile_comment_counts.test.mjs`

Result: **175 passed,0 failed,0 skipped**. Reviewer log `/tmp/hudhud-b15-native-independent.log`. Independently verified all seven patch hashes and every exact Functions input against correction provenance. Inspected author's328/328 Functions and lint/check GREEN evidence; coordinator is independently checking the actual combined source. Author tests/model remain unit evidence rather than native SDK acceptance.

After coordinator combined gates are GREEN, staged QA may be integrated and the first genuine empty-demo bootstrap/real event journey may be run under E ownership. That run must validate actual SDK query/commit precision, both-root Rules/private paths, born episode/real comment/moderation/count propagation, pause/retry/unknown-ACK behavior and no external messaging. Any failure reopens this local handoff until corrected. Full04-T09/B15, all producer/maintenance guards, nonempty reconciliation/recovery, original17 acceptance identities, final Flutter/device and operational approvals remain pending. No finding is CLOSED and no production action is authorized.

| Corrected input | SHA-256 |
|---|---|
| `functions/lib/comment-counts.js` | `8d39c9191ac3acd00adcfbd2d0d9bd6e3dcdd149a7e16c9c5a440b58179c2349` |
| `functions/test/comment-counts.test.js` | `271a4e7063a55b1bae63053dd998687bf88189389d5a314a1e67d37c38a03fd9` |
| `functions/test/support/comment-count-fixture.js` | `8cfc54bc8779c152a8331b97161eca30bd1cbea9998f143bdce92c533a96244f` |
| `functions/test/editorial-audit.test.js` | `e67c6473baca18b0197c26c7903650ee46e98919ce90b69a8fc92867605e52fc` |
| `functions/test/rss-ingestion.test.js` | `183cc4ac37199547f3877522e52339972a4a7b9d4ba08f522942466a1ad1963b` |
| `tool/reconcile_comment_counts.mjs` | `44c5b9de68d2ed92846569fc0dacbd10696ca156a7ccc861e7947ce626d9d0b9` |
| `tool/test/reconcile_comment_counts.test.mjs` | `8334827f7441f5d1352b0f9b97f91058a7bf91022f6e8c24c18794c70437b1b4` |
| `functions/lib/comment-count-maintenance.js` | `1a4f6ab12f8a7bc2dadb8f2ff4966829f8d37df08a028472c20076dcfd0f2d70` |
| `docs/contracts/firebase-data-contract.md` | `b8ee533155f50018b3b18ad158d95e426c533f648b27f25ba5fbddd92fdd3340` |
| `docs/decisions/0006-background-consistency-and-schedule-timezones.md` | `6e0f649906118111fcd01d0605e6d9dcaeb1ec4a9b30da089dc94c64674c2f4e` |
| `docs/operations/background-consistency-migrations.md` | `3f4a607fab2528c78da69b935e66c31798e72cf1f4fee7d80dac42f84ebf98ea` |
| `.boss/technical-review/evidence/WO-04/B15-native-correction-provenance.json` | `4d3620cb9c1658a3a88f73784fd64d86b8e25d4f18c79a9563b362ff28f767d7` |


## Actual partial 04-T08 runtime review

**APPROVED for the partial real-worker handoff and subsequent full 04-T09 implementation, once its separate nonempty wire schema is approved.** Full 04-T08, 04-T09, B15 and R12 acceptance remain incomplete.

The first actual registration baseline ran 43 tests: 41 passed and two intended business assertions failed, with no skips. In each root, real client published creation and moderation completed and counted 1; a later successful direct hidden write still left 1 instead of 0. The only change between that run and GREEN is adding countEpisodeComments to the isolated runner's export list. Independently compared all 11 recorded baseline inputs: the runner alone changed; core, index bindings, fixture assertions and support sources stayed identical. All 25 top-level identities, including their 43 total child/control tests, match across runs. This is a staged harness-registration integration RED, not a fabricated missing-module failure or a new claim of original source-defect RED. No previously enabled handler was disabled to manufacture it.

The unchanged GREEN suite passes 43/43 with zero skips and clean script exit/shutdown. Startup identifies the real moderation and count exports, and logs show the actual count handler executing. The isolated runner uses Node 22, explicit demo projects, temporary Functions entry/config, no copied developer env files, empty external moderation/messaging secrets, and the actual handlers. Its serialized root lifecycle runs the real empty-root bootstrap before fixtures. Canonical fixture creation uses the real birth-baseline authority and initial zero; it never seeds a corrected expected count or an active fence manually. The PL03 diagnostic sync control remains explicitly separate from new-comment journeys. The later hidden/published/delete case uses no manual sync to stand in for the event worker.

Additional actual gates inspected: account deletion 6/6 and editorial integration 82/82, both with zero failures/skips and successful script exit/shutdown. Account cases remove 26 authored orphan comments per root without recreating parents/baselines; retain Auth and job barriers on unaccepted legacy state; and exercise real manual-review/account-deletion races through the authority. Diagnostic preparation using the authority is not credited as new-comment trigger evidence. The initial account-deletion EPERM stopped emulator startup before tests; that log is retained but excluded from all RED/GREEN credit.

Editorial coverage adds exact native paused barrier/activeFrom equality and strictly later native release metadata, plus real-author canonical access and forged/role-only private denial. The additive patch does not relax existing assertions. All relevant harness/fixture paths have registered I integration ownership. Root package changes remain the two authorized emulator test script targets, with no dependency, lockfile, build or deployment change.

Current source/log fingerprints and identity comparisons are recorded in `evidence/WO-04/B15-registration-review-provenance.json`. The coordinator's exact combined native correction has 328 unit passes; the independent focused source review has 175 passes. Those unit results are distinct from the actual runtime gates above. This review does not re-run E or perform any application/production mutation.

Remaining obligations include nonempty reconciliation and conditional recovery, all maintenance producer guards, full real-worker and Work Order integration, the original 17 test identities, final Flutter/device acceptance and separate operational approvals. S01 still links to the HudHud FM platform itself; fresh focused source tests pass 12/12, but Chrome remains Debugger unattached and no visual acceptance is claimed. No finding is CLOSED.

| Runtime input | SHA-256 |
|---|---|
| `functions/index.js` | `e25125f6e8d1c27c8984b0a6e40adea06e1d9c44c969a1cda124540accf32a08` |
| `functions/lib/comment-counts.js` | `8d39c9191ac3acd00adcfbd2d0d9bd6e3dcdd149a7e16c9c5a440b58179c2349` |
| `functions/lib/comment-count-maintenance.js` | `1a4f6ab12f8a7bc2dadb8f2ff4966829f8d37df08a028472c20076dcfd0f2d70` |
| `functions/lib/comment-moderation.js` | `f2a3e61d94faef6e5d26ed910159832389a1809876052dbda79551821af8225c` |
| `functions/lib/admin-report-review.js` | `684c26a317b0aefb5375679fffd9e6a4933cfb703afe7026be7cb5cfaf783dc8` |
| `functions/lib/account-deletion.js` | `2d1bd423af798745fc28bf9034a55170889e266ba4aa9edc396187ae0e26fba0` |
| `tool/reconcile_comment_counts.mjs` | `44c5b9de68d2ed92846569fc0dacbd10696ca156a7ccc861e7947ce626d9d0b9` |
| `tool/run-count-emulator-tests.mjs` | `c98836dc4616745415ec49f67b91da8229a76bd617a8de8f9478c504263bbc6d` |
| `tool/run-admin-emulator-tests.mjs` | `c26edf6f6350c7569d30d460ea334a6c3f329fd6f9f2d53be4b7892cece6c3b3` |
| `firebase_tests/support/comment-count-fixtures.mjs` | `f9ad477a63a8711288971b23635de7f0469b50a2e8cbd7a19290ad89a3767cbf` |
| `web_admin/test/pl03-moderation.emulator.test.ts` | `dee9f4ebda334dec70ec5e75b0fc137980240c88c65ef1df658467c996ed6d3c` |
| `web_admin/test/support/callable-emulator.ts` | `a90b7d3763ddf847898505bd0a96953b40bd6c8283040ab53cf18768cd5c9c46` |
| `firebase_tests/firebase-emulators/account-deletion.test.js` | `3fa4909366c4ef399665b65a73102de8d70beff7528c601ba56750f85e3ef408` |
| `firebase_tests/firebase-emulators/editorial-comment-counts.test.js` | `be48b52b9b3a6b150ddb9cfd19feb2850960e6840a6a1494ff16835350031d73` |
| `firestore.rules` | `29feef1c8026085a21bc24aa129ecbead46425cf1876d627e4a992ada692a562` |
| `package.json` | `398bec06985069f9072fd7711d7228dc5572c4ae31566b22d0e8ccb4f17ab225` |


## Narrow post-barrier empty-fence recreation correction

Status: **APPROVED narrow source/model checkpoint only.** The retained integrated baseline executes 23 tests: 21 pass and two intended assertion failures, zero skips. Both supported roots previously accepted copied active data after their root fence was genuinely deleted and recreated with native createTime later than the historical barrier. The model explicitly proves that adversarial setup before invoking replay and captures tool write counts after setup; it does not manufacture a counter-loss claim.

The only source correction requires a valid native root createTime no later than the barrier while preserving every original accepted-empty condition and later native updateTime check. Reversing exactly this guard reproduces the recorded pre-fix source SHA-256. Permanent RED assertions remain unchanged. Independent exact Node22 rerun passes 23/23 with zero skips and exit 0, matching parent integrated GREEN.

Current root tool SHA-256: `c46238aef4fdb072349e45c2e6f7a14ff2b50b24d15e7984448b89f5ae15709e`. Test SHA-256: `a5a575d211d2c59f5b5e8767ab9feb2bb44c535e776ef8def777258b728227e3`. Full patch/log fingerprints are in `evidence/WO-04/B15-empty-fence-identity-review-provenance.json`.

No actual SDK root-recreation case has yet executed, and this comparison cannot prove the absence of every pre-barrier privileged rewrite or arbitrary unfenced Admin SDK writer. The normal 91/91 producer evidence remains historical scoped evidence, not evidence of this later guard. Full nonempty source remains isolated and unaccepted; provisional development tests are not a handoff. Full 04-T09, B15 and R12 remain OPEN. No emulator, Flutter, migration or production operation was performed by this reviewer.
