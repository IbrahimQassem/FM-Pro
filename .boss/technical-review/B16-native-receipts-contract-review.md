# C04-TIMEZONE native item receipt contract review

Status: **APPROVED docs-only technical amendment; live integration remains held.** This resolves the precise native identity blocker in the B16 readiness preflight. It does not start B16, accept implementation or authorize operations.

Independent reviewer: `/root/b10_review`. Proposal author: QA b09. Reviewed `/tmp/hudhud-b16-native-receipts-contract.patch`, SHA-256 `9ff895a5271c6c52a04ef158d38c55f9e7dd6e0a670c691e506a1a57e5929e3f`, and its input metadata. All current input and proposed document fingerprints match; `git apply --check` passes. The later B15 appendices in all three documents remain byte-identical. No tests, source edits, emulator, Flutter or production operation were performed.

The correction is sound for the single V2 occurrence target per item:

- `targetChanged` distinguishes a genuine authorized changed projection from a preserved/no-op target. The immutable item receipt commits atomically with a changed target and job checkpoint. Its native snapshot updateTime proves the changed update version, and proves createTime too for a newly created target.
- Stored targetCreateTime/targetUpdateTime describe exact pre-write observations. Existing target create identity remains literal. Preserved target updateTime remains its observed version even when the item receipt is later; proven absent no-op retains null/null. Unknown metadata cannot be represented as proven absence. Identical-data requests cannot manufacture a changed receipt.
- `recordedAt` is operational, and no REQUEST_TIME/serverTimestamp field impersonates exact native metadata. Postcommit readback, unknown-ACK recovery and committed-prefix verification use the original immutable receipt/native target proof. Equal-value ABA, delete/recreate and mismatched or missing proof remain conflict/held, without repeating uncertain writes or rewriting receipts.
- Projection exclusion is restricted to action-defined newly generated operational server-timestamp fields. Copied carry clocks, statuses, attempts, lease/backoff/expiry and compatibility evidence remain hashed; no caller-selected ignore list is allowed. V1/source/stamp records stay read-only in this tool.
- Conditional recovery preserves fresh source/backup/native CAS and non-erasing held rollback. No-op entries have no owned target mutation to undo. SENT/UNKNOWN suppression, ambiguous held evidence, original carry clocks and retry policy remain unchanged. Absence proves only observed absence under verified isolation, not arbitrary unfenced history.

The patch preserves offset/local-date policy, exact key/fingerprint tuples, legacy decision matrix, shared sender defaults, private namespaces, 25-entry bounds and production refusal. No collection, service, dependency, generic receipt framework, task, wave or owner change is introduced. The original 65/16/17/75/87 registry counts are unchanged.

Parent I must integrate serially only after the current count source/contract freeze. At that integration, pending-review wording may become accepted technical contract with this review reference; no additional semantic change is approved. Record final integrated hashes. Future source gates must verify finer native precision, unchanged/no-op targets, preserved clocks/evidence, postcommit lost ACK, ABA/recreation and non-erasing recovery with actual regression assertions and applicable SDK evidence. This docs-only review supplies no RED or GREEN test credit. Full B16/B15 and all findings remain OPEN.

Exact reviewed input/candidate fingerprints are recorded in `evidence/WO-04/B16-native-receipts-contract-review-provenance.json`.
