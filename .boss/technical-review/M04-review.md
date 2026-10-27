# M04-T12-FENCE-READY independent source review

Date: 2026-10-26. Reviewer: independent `b10_review` agent; no implementation authorship.

## Verdict

**APPROVED: verified interim partial Rules handoff.** No blocking issue found in the exact Rules/test candidate. This does not complete04-T12, B15/B16, R12 or production readiness. No finding is CLOSED.

## Source and contract verification

The Rules helper accepts only the approved complete active shape: version1, active state, positive safe-integer generation, opaque trimmed nonempty owner of at most128 characters without slash, lowercase64-hex planHash, nonnegative safe-integer epoch-millisecond lease, writerProtocol1, native Timestamp activation and lowercase64-hex baseline manifest hash. Missing fences preserve legacy operation; present paused, malformed or unsupported state cannot permit comment creation. Lease expiry is not a pause release. Rules validate one snapshot; trusted maintenance transactions must enforce historical generation advancement and trusted activation timestamps later.

The fence is read within comment-create Rules evaluation and remains conjunctive with the original authentication, verification, profile ownership, UGC agreement, publication, episode and account-deletion safeguards. Independently compared the candidate with HEAD: all source after the unchanged original comment field validation remains byte-identical. Existing comment update/delete rules, canonical collection-group audits, importKeys permissions and default deny are unchanged. No privileged client maintenance bypass was added. Root/episode baseline and new `contributions` ledger remain private by default.

The only fixture namespace changes from the baseline test patch are the three planned ledger path references moving from `comments` to reviewed `contributions`. The28 paused/malformed creation assertions retain their expected denial. The historical oldnamespace leak log remains a design mismatch; newnamespace privacy GREEN is not claimed as newly failing business RED.

## Actual evidence inspected

- Baseline actual Rules suite: **75 tests,43 passed,32 failed,0 skipped**. As independently classified in M04-contract-review.md,28 are intended paused/malformed creation failures and four are oldnamespace privacy/list design failures. No compilation/setup/environment failures are credited.
- Updated actual Rules suite: `.boss/technical-review/evidence/WO-04/M04-fence-green.log`: **75 passed,0 failed,0 skipped**, successful script exit and emulator shutdown. Includes both roots, absent/valid-active creation, current/expired pause, malformed fences, retained authorization/deletion conditions, role/private path operations and bounded canonical audit compatibility.
- Parent candidate hashes match the fix provenance. Source review and log inspection were read-only; this reviewer did not launch E/F, modify application source or execute any migration/deployment.

## Scope and remaining gates

This partial output can satisfy the named milestone's local handoff; it cannot substitute for server-side enforcement because Admin SDK bypasses Rules. B15 must implement the matching dependency-free helper and actual transaction fences across all owned writers, retry semantics, count authority, complete frozen inventory/reconciliation, review and affected GREEN. Maintenance/reconciliation/apply/restore/activation requires bounded read-only oldnamespace preflight to exhaustion and refusal on legacy records; ordinary triggers must not scan the entire ledger. Full04-T12 remains in B16 with its original prerequisites. Preserve65 tasks,16 batches,17 waves, original skipped-test identities, full Flutter and physical-device acceptance and separately authorized production approval.

## Reviewed fingerprints

| Input | SHA-256 |
|---|---|
| `firestore.rules` | `29feef1c8026085a21bc24aa129ecbead46425cf1876d627e4a992ada692a562` |
| `firebase_tests/firebase-rules/firestore.rules.test.js` | `17b3cd26fad8d8865912884091401bdd0252433956758bd12df9024a90311904` |
| `docs/contracts/firebase-data-contract.md` | `c0ad347610b449f8d1e371007c66c87cd8f8f74e83959da59bcec3bc233499e5` |
| `docs/decisions/0006-background-consistency-and-schedule-timezones.md` | `9a053d1c77d129a91d487866bd71eb7723b5b9cf6f1266eea7e2508a56435a85` |
| `.boss/technical-review/M04-contract-review.md` | `947a0130285bc4b734f201b2097304b43b1d836e53c694eddeeac80e28ee7cca` |
| `.boss/technical-review/evidence/WO-04/M04-fence-baseline-red.log` | `990473455c24dad5d0c6ef86906f03c43a6ad49ca8e0621fc0f203305aaa4a96` |
| `.boss/technical-review/evidence/WO-04/M04-fence-green.log` | `df3250a42e6ca82288b1f3e5c866fe6cc51c773a6a90215ba49047c811e9707f` |
