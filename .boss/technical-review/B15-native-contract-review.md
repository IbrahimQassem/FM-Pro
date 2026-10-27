# B15 native precision schema independent review

Date: 2026-10-26. Reviewer: independent `b10_review` agent; no implementation authorship.

## Decision

**The proposed native-binding mechanisms are APPROVED, with two mandatory wording corrections below before contract integration.** Existing source/bootstrap remains BLOCKED until corrected source GREEN and independent review. This review permits the described correction design; it does not claim the source fixed, authorize actual bootstrap/production operations or close R12.

Reviewed the exact three-document proposal, blocked provenance, permanent two-assertion precision RED, current count/early-bootstrap code and the [official Firestore RPC contract](https://firebase.google.com/docs/firestore/reference/rpc/google.firestore.v1#servervalue). REQUEST_TIME has millisecond precision; the contract does not equate it with finer native document metadata. Document create/update versions are separately defined and comparable across documents. No E/F, source/docs mutation, migration or deployment was performed by this reviewer. The original proposal passes git apply --check.

## Approved mechanisms

- A newly created private origin=creation baseline is immutable. Its native snapshot updateTime supplies the exact same-transaction episode birth receipt, compared with the episode's native createTime. Remove duplicated transform-derived birth identity. An unexpected rewrite invalidates this form.
- Reconciliation/recovery rewrites use origin=baseline with explicit verified literal native episode createTime, retaining accepted lineage and independent data generation. Restoring creation-form body and treating a new restore version as old birth is prohibited. Without verified conversion, retain pause and require reviewed rebaseline.
- Contribution rows distinguish observed native commentVersion from an intended atomic commentMutation receipt. Genuine no-op writes may retain document versions, so the original observed-before version also has a limited unchanged-case role. No REQUEST_TIME value supplies comment version identity.
- Root activation uses an actual paused native barrier, then a separate guarded atomic release binds its literal version as activeFrom/barrierVersion. Validate exact plan, owner, generation, lease, complete inventory/digest/baseline proofs and durable backup before release; no legal writer may run in the gap. Old/unowned isolation remains mandatory and unsupported in production. Release metadata is later than, not equal to, the barrier; replay verifies the accepted result read-only.
- All mechanisms remain in existing root/per-episode/contribution records, with no generic mapping service, new collection or dependency. Recovery remains version/CAS-bound and cannot reopen unsafe writers.

## Mandatory integration wording

Replace the contribution paragraph's unconditional “effective version must match the current comment” wording with:

> Receipt or observed-before equality is evidence only for the unchanged/no-op fast path. A mismatch with a legitimate newer current comment is not an admission failure: validate episode identity, accepted lineage and prior contribution, then recompute desired-minus-prior from fresh canonical state atomically. Record the new observed or atomic-mutation version as appropriate. Never reject ordinary newer status/update/delete work solely because its version differs from the previous contribution receipt; stale event snapshots remain non-authoritative.

Add explicit contribution recovery wording:

> Before rewriting/restoring a commentMutation=true row, resolve and verify its native version using the original row snapshot receipt and canonical comment/episode identity. Persist the rewritten record as commentMutation=false with an exact verified literal observed native comment version, or retain pause/reconcile if no such safe conversion is possible. Never copy the old mutation-receipt body and reinterpret the restore write's new native updateTime as the old comment mutation commit. A changed canonical comment requires fresh authorized reconciliation, not restoration of a stale contribution/version. Missing/deleted comment version remains null.

These clarify the intended algorithm without changing arithmetic ownership, product flow, or accepted native metadata semantics. The creation-baseline immutability/conversion text is already explicit and must remain.

## Required correction evidence

Retain the two permanent precision RED cases. Correct the model to distinguish REQUEST_TIME rounding, exact native metadata, genuine no-op document writes and ABA/recreation. GREEN must include birth identity, paused barrier/release/readback and lost acknowledgements; mutation-receipt and no-op paths; legitimate newer status/delete transitions; creation and contribution rewrite/recovery conversion; unchanged accepted lineage; and exact native timestamps. Run affected count/moderation/producer/tool checks and independent source review before first real demo bootstrap/event use. The old55 model proof cannot substitute. Full04-T09/B15, actual SDK/worker/Rules integration, original17 skipped identities, Flutter/device and separately authorized production gates remain pending. No finding is CLOSED.

## Reviewed fingerprints

| Input | SHA-256 |
|---|---|
| `/tmp/hudhud-b15-native-contracts.patch` | `3d448c42689a2944f82b93b8115a9ca0cf3e9e844afb53cb6b5a2039e8157c13` |
| `.boss/technical-review/evidence/WO-04/B15-bootstrap-blocked-provenance.json` | `f40b6a769b8de163b17f75b5b2eb26ab4df678fd789745448403d5868c4c9c40` |
| `.boss/technical-review/evidence/WO-04/B15-native-precision-red.log` | `e9d426866aa1523f7cf2ac54213d4ef51ad38d452612824037a254d3a1df1025` |
| `functions/lib/comment-counts.js` | `a1777fb2d1a77296c5489052785ecddaeaf6e03081232342991af28ff54983d5` |
| `tool/reconcile_comment_counts.mjs` | `4f199c259826e62c12ba0359dfa58a8bd7d2957766780d422e2f9d24bcfcb1a8` |
