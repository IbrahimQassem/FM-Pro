# M04 count-fence contract review

Date: 2026-10-26. Reviewer: independent `b10_review` agent. Scope: the proposed contract/type/namespace amendment and existing test-only baseline, before Rules implementation.

## Verdict

**APPROVED for the narrowly scoped M04-T12-FENCE-READY implementation.** No blocking issue found in the proposed field types or namespace. This is contract approval, not Rules GREEN, root activation, B15/B16 completion, finding closure, or production authorization. Reviewer changed only this report and launched no emulator or Flutter process.

## Exact approved wire schema

- `version` and `writerProtocol` are integers exactly1; `state` is exactly `paused` or `active`.
- `generation` is a positive safe integer through9007199254740991. Trusted transactions enforce monotonic advancement; Rules cannot infer history from one snapshot.
- `owner` is an opaque nonempty trimmed string of at most128 characters without slash. `planHash` is exactly64 lowercase hex characters.
- `leaseUntil` is a nonnegative safe integer epoch-millisecond value. It is an operational lease, not the activation timestamp, and expiry never releases pause.
- Active state requires native Firestore Timestamp `activeFrom` from the trusted atomic activation commit and exact64-lowercase-hex `baselineManifestHash`. Preserve native seconds/nanoseconds; do not substitute rounded epoch milliseconds or a client clock. A dependency-free server helper can validate the SDK-returned Timestamp structurally without a Firebase import; enforce valid native timestamp component ranges. Rules must require native timestamp type.
- Missing root fence retains legacy normal flow. A present paused or unsupported/malformed active fence denies normal writes. Retained previous activation fields cannot bypass pause. Existing authorization, verified-email, profile ownership, UGC agreement and deletion safeguards remain conjunctive requirements.

The future helper must preserve the same validation semantics as Rules. This review does not approve an unimplemented helper, bypass flag, generic locking service or premature active baseline.

## Namespace and permission reconciliation

Approved private leaf: `{root}/commentCountContributions/episodes/{episodeId}/contributions/{commentId}`. The old planned `comments` leaf collides with the existing recursive `comments` collection-group administrator list allowance. Firestore allow rules combine permissively; adding a deny does not override that allowance. The new unreleased collection name avoids the overlap and remains default-denied without rewriting canonical comment audit Rules. Root fence and per-episode baseline documents remain private. Existing canonical comment reads/audits and established importKeys reads remain unchanged.

No implementation/live migration of the old planned ledger namespace exists in this reviewed handoff. Preserve the old-path leak probe as historical design evidence. New-path private access tests are GREEN guards, not fabricated newly failing vulnerability evidence.

Required wording clarification for integration: **Before maintenance/reconciliation, apply, restore or activation, perform bounded, read-only preflight audit of the applicable old planned ledger namespace to exhaustion. Refuse all maintenance mutation/activation if any old records are found, and report for separate review. This is a maintenance preflight obligation, not an unbounded collection scan in every normal event handler.** No automatic rename, copy, delete, merge or cleanup is approved. Continuation/exhaustion evidence must not be replaced by checking only the first page.

## Baseline evidence assessment

Inspected the permanent test-only fixture and `.boss/technical-review/evidence/WO-04/M04-fence-baseline-red.log`. Baseline Rules are unchanged at the fingerprint below. Actual result: **75 tests,43 passed,32 failed,0 skipped**.

All32 failures are intended business assertions after valid setup and successful Firestore operations:28 paused/malformed-fence creation cases (14 per root) report `Expected request to fail, but it succeeded.`; four old-namespace privacy/list assertions (two per root) report the same unexpected authorized access. There are no missing-module, compilation, fixture-hook or environment failures counted as RED. Absent/valid-active authorization and retained authentication/ownership/agreement/deletion checks pass. The bounded canonical admin comment audit itself returns only the canonical document; the final old-ledger direct-list assertion demonstrates the separate namespace leak.

Changing the unreleased namespace is a reviewed design correction; do not claim a fix to existing canonical comment permissions. Newnamespace tests must use `contributions` and execute actual get/list/create/update/delete denial across roles and both roots. Preserve the original oldnamespace failure log rather than requiring denial under an intentionally preserved comments collection-group permission.

## Remaining gates

Integrate only the owned Rules/test milestone after contract amendments. Capture actual both-root GREEN, independent Rules/source review and input fingerprints before marking M04 verified. Add malformed-field boundary tests as needed for the exact supported schema. The milestone remains a partial04-T12 output depending on C04-COUNTS; full04-T12 stays in B16. B15 still needs all server writer guards, retry semantics, complete frozen identity inventories, contribution authority, rehearsal and integration checks. Task/batch/wave counts remain65/16/17. Physical-device, original skipped-test obligations and separate operational approvals remain intact. No finding is CLOSED.

## Reviewed fingerprints

| Input | SHA-256 |
|---|---|
| `/tmp/hudhud-m04-fence-contracts.patch` | `b72d9b2c0ea2218a432ff8b29eef596e610492613d6a33985019385d6234ce0a` |
| `firebase_tests/firebase-rules/firestore.rules.test.js` | `3e48ec62d984903ea988dcf2d8b561613f298f2ecefa1c35a86ae90b0a30fb36` |
| `firestore.rules` | `b792a71572cf2822aa8e74278dea82043fe40a60a67bad29fbc299ba347d58e9` |
| `.boss/technical-review/evidence/WO-04/M04-fence-baseline-red.log` | `990473455c24dad5d0c6ef86906f03c43a6ad49ca8e0621fc0f203305aaa4a96` |

### Integrated amendment confirmation

The coordinator integrated the reviewed proposal with the maintenance-only, bounded read-only old-namespace audit clarification. The native Timestamp/safe epoch-millisecond types and private `contributions` namespace are unchanged. **Final contract approval confirmed** for these integrated document inputs; Rules implementation and actual GREEN remain pending.

| Integrated document | SHA-256 |
|---|---|
| `docs/contracts/firebase-data-contract.md` | `c0ad347610b449f8d1e371007c66c87cd8f8f74e83959da59bcec3bc233499e5` |
| `docs/decisions/0006-background-consistency-and-schedule-timezones.md` | `9a053d1c77d129a91d487866bd71eb7723b5b9cf6f1266eea7e2508a56435a85` |
| `.boss/technical-review/WO-04.md` | `a8e9cbc992c32d63ab0b8ddd6270e60dc2630c897c9f50cbaaee29326ffc6910` |
