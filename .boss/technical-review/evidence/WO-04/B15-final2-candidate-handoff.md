# B15 full04-T09 final2 source handoff

Status: **LOCAL_GREEN; independent source-review conditions satisfied. Parent integration and native SDK acceptance remain pending. Full B15/04-T09/R12 are OPEN.**

## Integration

Candidate: `/tmp/hudhud-b15-final-revision2`. Parent I is the sole shared-file writer. Apply the two reviewed artifacts together before testing the combined source:

- `/tmp/hudhud-b15-status-projection-export.patch`, SHA-256 `80844b884f0c851dadafa5aa2dc1c7e8823bf01fb62122dda1bfc783eb8dd540`: only exports existing unchanged `statusContribution` in `functions/lib/comment-counts.js`.
- `/tmp/hudhud-b15-final2-implementation.patch`, SHA-256 `1dad0e8542316e42b20c8caf3a99f857ea95a21f14954aa4a5f7f4d6310816ee`: `tool/reconcile_comment_counts.mjs`, `tool/test/reconcile_comment_counts.test.mjs`, and additive `docs/operations/background-consistency-migrations.md` appendix. Existing B16/contract appendices remain preserved.

Both applicability checks pass against refreshed unchanged root inputs. Tool input remains c46238ae, tests input a5a575d2, operations input85c47271, core input77fc7b9d. Candidate tool is `2c7e00ba992b6a1d511cf09174d9cb626958c13de50d75dc8c4d15ba9d3efe1e`; tests `882ec1a7ce03d71e369357e2174954092078cf7c152bf811f10d4bba5ef58fbc`; operations `d9dfc0f2b0662c0de5e36a0b9de2ca3dea35923b18e30063e19bf4cccddd3f19`; core `08e356c3c6bc6eadfedaf5acb75bc7d5a8e4154b1f73f63931e10cba8dd62b04`.

## Verified source evidence

Exact Node22 full test command: `node --test tool/test/reconcile_comment_counts.test.mjs` in the candidate, with the approved Node22 directory prepended to PATH. **150/150 PASS, zero failures/skips/cancellations, exit0,507982.151104 ms.** Log `B15-final2-full-green.log`, SHA-256 `fe521e4f834c5a83584400422076de20954451263c1725f47cb9de0de4fe376f`.

Focused review/schema/partial cases pass87/87 with zero skips. Functions pass328/328 with zero skips. Lint and explicit syntax checks pass. All recorded root inputs/candidate outputs match; the Functions snapshot differs from root only by the authorized one-keyword projection export. Exact final manifest: `B15-final2-candidate-provenance.json`, SHA-256 `a775258004db315b88632697c4be98c350108042ed967a9ab53b7097111558d3`.

The protocol reviewer independently passes31 relevant cases; the security reviewer independently passes15 final2 cases. Their exact-hash conditional decisions are in `B15-nonempty-source-review.md` and `B15-nonempty-security-review.md`. Their single-full150 condition is now satisfied; neither approval substitutes for native SDK/Rules/integration acceptance.

Original Root23 and all original63 assertion bodies remain preserved. All later accepted81/127 bodies remain unchanged through typed/partial corrections. Historical candidate failures, setup errors and deliberately interrupted partial full runs remain retained/classified; none is relabelled full GREEN or historical R12 RED.

## Actual API and actor contract

Existing demo factory, private backup store, preview and early empty bootstrap remain. New exports `applyCommentCountReconciliation` and `restoreCommentCountReconciliation` accept `{firestore,projectId,root,manifest,expectedManifestHash,backupStore,owner,maxItems}`. maxItems is1..25; keep stable explicit owner and reviewed backup custody. Public `now` overrides are rejected. Results are `{status,phase,processed,cursor:{nextUnit,episodeId},readEquivalents,transactionAttempts}`; status is in-progress/active/restored-held. Cursor is informational only.

Restore supports committed inventory/staging/verifying/barrier prefixes as well as completed active applies. Never-activated rollback retains absent release fields/null verification stage where legitimate. It never fabricates activation; held stays paused. Every applicable inverse checks fresh native source and target. Without a counter head, exact parent updateTime must match the original source; with a counter head, its sealed latest physical receipt remains authoritative. No content/status/parent creation or resurrection occurs.

Private IPC actors stay in the same registered test file. `--count-sdk-maintenance-child`: kind count-sdk-maintenance, operation apply|restore, one accepted API call. `--count-sdk-replay-child`: kind count-sdk-replay, requires an actual active full result, one read-only replay call. Request `{version:1,kind,operation?,projectId,root,emulatorHost,directory,expiresAt,keyBytes,manifest,expectedManifestHash,owner,maxItems,nowMs?}`. Key bytes remain private IPC/memory, never argv/environment/logs. Optional finite nowMs maps only within the test actor process runtime. Response kind count-sdk-result, minimal outcome/metrics or sanitized refusal; preflightReadCount0 maintenance/2 replay. No public fault flags, arbitrary database injection or production clock bypass exists.

## Remaining parent gates and boundaries

Refresh/apply only the four approved paths, run exact combined focused/Functions/lint gates, then parent/QA actual SDK103-case/N01–N14 rehearsal and supplements. These include large inventories/unions, maxItems1, native precision/no-op/ABA/restore conversion, lost commits/ACKs, partial-prefix rollback and late source CAS, competing fresh-process local replay, custody/expiry/locks, actual client permissions and legal writer pause ordering. Preserve the original17 skipped emulator identities and remaining full Flutter/browser/physical-device obligations. No E/F/native SDK process was launched by this author.

Production apply/restore/activation and direct CLI mutation remain unsupported/refused. Application-visible read/attempt limits do not prove internal transport retries, billing/index charges or latency. Keep held isolation on any conflict or unsupported native conversion; no old-worker release or automatic reactivation. No production data operation, deployment, merge or real message occurred. No finding is CLOSED.
