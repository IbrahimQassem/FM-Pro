# B15 consolidated private checkpoint contract review

Status: **APPROVED technical contract, with the explicit empty-prefix sentinel below.** No blocking semantic issue remains in the consolidated persisted-state protocol. Source integration and actual runtime acceptance require their separate gates.

Independent reviewer: `/root/b10_review`, not the author. Reviewed `/tmp/hudhud-b15-checkpoint-audit-contracts.patch`, SHA-256 `ef2b4a8a5b60c2d3cd9f043c79d09222627228a5bee2aa7920d8aee5c3915ad2`. This review covers the full additional field/type/initialization/phase/recovery audit together; it does not approve isolated provisional source.

## Decision and required boundary wording

The plan's `resumeMaxUnit` captures the committed prefix before recovery appends any receipt. `resumePhase` advances receipts → heads → ready only after exact frozen prefix, target-head/current-target CAS, physical predecessor ancestry and applicable fresh source verification. New no-target verification checkpoints cannot move the frozen recovery boundary. Same-owner bounded continuation preserves progress; a newly acquired epoch restarts proof against a newly frozen finite prefix. Historical receipt issuance epochs do not become current ownership requirements.

The one-pending-native-receipt invariant is coherent. `receiptDigest` folds only observed native metadata. Each next guarded commit folds its predecessor, then appends one adjacent receipt. The final paused barrier is the one pending receipt: the release transaction folds it, records the full accepted proof prefix, and creates the adjacent release receipt. Exact later root/release-receipt identity readback is mandatory. This avoids self-reference, sequence gaps and an unbounded final scan.

Apply this exact sentinel clarification during integration: **`foldedUnit` is null when `lastUnit` is null or 0; for `lastUnit >= 1`, `foldedUnit == lastUnit - 1`.** No negative sequence is valid. Refuse allocation before the accepted 12-digit sequence limit would overflow; no wraparound or ambiguous sentinel is permitted. This only makes the declared initial state explicit.

## Preserved invariants

- Private episode `proofUnit` identifies its single immutable proof. Original staged evidence and completed proof state remain immutable. `resumeSource` uses one fixed-size scratch map for a fresh post-recovery source pass, avoiding proof duplication or rewriting original staged counts/digests.
- Plan/head/receipt cursors and maps have bounded exact types and remain within the existing private records. Each head/ancestry visit, source row and empty transition is a logical unit. Fixed admission/CAS rereads remain separately bounded, so `maxItems:1` can make persisted progress without turning a page or ancestry walk into one free step.
- Per-receipt root/plan/episode postimage hashes are sealed by the receipt's exact native commit version. A later same-body unowned controller write or delete/recreate cannot be adopted merely because its hash matches. Each episode lastUnit follows its own completion receipt rather than the latest unrelated episode transaction.
- Purpose-bound encrypted unit payloads contain only owned counter/private-record images, opaque IDs, native source metadata and checkpoint/proof hashes. No canonical body, whole episode, author, URL, user content or credential enters custody payloads or logs. Receipt/payload field, slot and identity agreement remains mandatory.
- Reverse restore retains its frozen apply boundary and separate logical versus physical heads. Native receipt conversion, fresh conditional inverse CAS and restored-held pause remain unchanged. Before-activation complete source/union proof, all legal writer fencing, backup custody/expiry and exact native activation remain required.
- Historical accepted replay stays Firestore read-only and uses its separately approved local authenticated checkpoint. Visible callback/read caps remain 3 attempts and 1536 application-issued equivalents; SDK transport/billing visibility is not claimed.

## Remaining implementation gates

Prove phase and empty-scope transitions with `maxItems:1`, fresh processes and bounded recovery under the exact final schema. Required cases include a prefix longer than 25 receipts, recovery that appends checkpoints without chasing them, immutable proof preservation, lease loss during verification/barrier, current controller ABA/delete-recreate, pending-tail and sequence-boundary handling, owned target chains/no-ops, loss of acknowledgement, payload disagreement, malformed state and budget exhaustion. Discovery/import failures and provisional absent-export failures receive no behavioral RED credit. Full source review and actual SDK rehearsal follow implementation; the earlier 91/91 producer gate does not replace them.

The separate early-bootstrap root recreation issue remains a distinct regression/fix/review obligation; it cannot be assumed fixed by this new full-tool contract. Full 04-T09, B15 and R12 remain OPEN, B16 remains dependent on B15, and production operations remain unsupported.

I may integrate only the explicit sentinel/overflow clarification above, accepted-status/review-reference wording and normal English spacing beyond the reviewed patch. Any other semantic change requires review. Input fingerprints and permitted integration corrections are recorded in `evidence/WO-04/B15-checkpoint-audit-review-provenance.json`. No application source/test, emulator, migration, deployment or production operation was modified or run by this review.


## Accepted integration bookkeeping

Independent comparison confirms accepted patch `/tmp/hudhud-b15-checkpoint-audit-contracts-accepted.patch`, SHA-256 `546f42f8f4ff6db2195ec613a573342e42fe0a03116000dc1f3985fd7a2ef089`, differs only by approved status/review-reference and explicit foldedUnit sentinel/overflow clarification. The current contract remains APPROVED; provisional source is not accepted. Integrated document fingerprints:

- `docs/contracts/firebase-data-contract.md`: `4e67f7d3fcc690c21285e9992eddea9b346e64059dcd03914c1536962106e097`.
- `docs/operations/background-consistency-migrations.md`: `85c47271154a332ed2591b9cb74bf55f72069d5de8938f306842b36b63092fd8`.
- `docs/decisions/0006-background-consistency-and-schedule-timezones.md`: `ef0db668fc0ebf3357a9df2e042d75964abb6187da7bd2fc23e9dff087e4d2ed`.
