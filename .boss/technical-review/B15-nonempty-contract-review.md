# B15 nonempty reconciliation contract review

Status: **APPROVED — v2 accepted technical contract.** The two original wire gaps are resolved in the independently reviewed v2 proposal and accepted integration below. Historical rejection remains recorded separately. This approval releases implementation, not source/runtime acceptance or production operations. No source, emulator, production operation or migration was performed by this reviewer.

## Historical v1 proposal and superseded rejection

`/tmp/hudhud-b15-nonempty-contracts.patch`, SHA-256 `bc7ba6e6cb1f24d04f2009ab6950a42fd1c0e0385a8a5c4e78d339bc8e6968ea`.

The proposed private plan, inventory/completion and unit receipt approach is compatible with the existing root fence, count authority and native precision correction. Bounded union staging must include both canonical comments and all old contribution/tombstone IDs. The source/count privacy limits, production refusal, conditional recovery conversion and restored-held endpoint are appropriate. Two exact wire gaps must be resolved before implementation:

1. **Historical target versions and restore supersession.** A historical receipt cannot require its target's current native version to equal that old receipt after a legitimate later plan-owned write. Persist a concrete bounded per-target head and immutable predecessor chain. Changed targets derive expected native versions from the latest authorized physical receipt; no-ops retain observed versions. Reverse restore names each reverted apply unit, freezes the apply range, and moves the physical head to the new restore commit while the logical head returns to its predecessor. Earlier restores must accept that newer proven restore version rather than comparing with obsolete metadata. Literal native recovery conversion needs its own restored projection hash. Unknown external versions, ABA or recreated identity must stop paused. Receipt issuance epochs are historical; current ownership/epoch gates new writes without invalidating older legitimate receipt history.
2. **Inventory identity versus mutable source versions.** Define inventory equality over ordered episode ID/exact native createTime only. Store original source versions separately and permit expected current versions to advance exclusively through verified owned target receipts/heads. Otherwise a legitimate counter-finalization write changes its episode's version and can invalidate the tool's own second inventory digest. Keep rolling bounded identity digests rather than arrays of all IDs.

Exact constraints were sent directly to the implementation author for a documentation-only revision. A prefixed mutable head record inside the existing units collection is a minimal option, provided its target hash includes document path plus owned field, it cannot collide with numeric immutable receipt IDs, query selectors distinguish heads/receipts, native identity is never inferred from REQUEST_TIME, and verification/traversal remains within invocation bounds. This is not approval of an unreviewed revised schema or implementation.

## Producer-test attachment review

**APPROVED for the scoped manifest patch only.** `/tmp/hudhud-b15-producer-test-attachments-scoped.patch`, SHA-256 `942c8ab09c678f08e1f796cd45b0d650014b7126888cfbd38883fe1fccce4d46`, passes applicability check. Independently reconstructed the proposed JSON: all original 72 ownership entries are unchanged; the resulting 75 paths are unique. The original 65 tasks, 16 batches and 17 waves remain.

The two existing RSS/pagination regression paths become explicitly shared under I integration ownership. One cohesive BE-authored producer regression file covers the four already-registered import/seed/status/preview writers; its policy requires isolated author patches and I integration. QA emulator fixtures and prior assertions remain protected. The two unrelated Unicode serialization hunks from the original proposal are absent. Test files must exist, import and discover genuine behavioral assertions before execution; missing APIs, compilation failures and skips cannot establish RED. This attachment approval does not release source until the nonempty schema is approved.

## Continuing acceptance limits

Partial registration GREEN (43/43), account deletion (6/6) and editorial integration (82/82) do not complete full 04-T08, 04-T09, B15 or R12. Full nonempty source, producer RED/fixes, native/ABA/restore guards, actual rehearsal and independent source review remain required. Preserve B16/native contracts, original test identities, final Flutter/device and production checkpoints. No finding is CLOSED.


## Revised v2 decision — approved technical contract

**APPROVED for integration and full 04-T09 implementation.** The v2 proposal resolves both preceding wire gaps. This is a contract approval, not completed tool/source verification, live activation, full B15 acceptance or finding closure.

Revised proposal: `/tmp/hudhud-b15-nonempty-contracts-v2.patch`, SHA-256 `4e9674f0ba04c83bcb23b9e569ce3895e5eb8a0445cd0d4caa85182a1dea6a68`. The author reported pre-integration applicability success. The reviewer's later applicability check occurred after I had integrated the accepted contract and therefore no longer applied; this is not a source/test gate failure. Independent comparison of the integrated appendix with the v2 proposal confirms only the permitted status/reference wording changes. The original v1 identity and review blockers remain historical evidence.

- Target keys bind canonical document path plus exact owned field or null. Disjoint prefixed mutable heads share the existing private units collection with numeric immutable receipts. Bounded selectors separate those record types; no new collection, dependency or generic mapping service is introduced.
- Explicit target slots, predecessor links and current physical receipt distinguish historical apply identity from the current target version. Only the verified latest head supplies current native version/postimage. Historical receipt issuance epochs remain valid history while current lease ownership gates new mutations.
- Reverse restore freezes its apply boundary, records each reverted unit/slot and physical predecessor, and moves logical heads backward while physical heads advance to immutable restore commits. Genuine no-ops retain observed versions. Literal identity conversion has explicit original/restored projection hashes and cannot reinterpret restore metadata as historical birth/mutation identity. All traversal and resume verification remain bounded across calls.
- The rolling inventory digest contains ordered episode ID and exact native createTime only. Initial source versions remain immutable CAS inputs; expected source versions advance solely through verified owned counter heads/receipts. Honest counter finalization does not invalidate identity equality; unowned versions, ABA and recreated identity still fail closed.
- Full current-comment/contribution union, tombstones, exhausted verification, paused native barrier/release, encrypted per-unit backups, conditional recovery, oldnamespace refusal and production isolation limits remain mandatory. Completed restore remains paused/restored-held, never automatic legacy traffic release.

The scoped test-attachment approval above is confirmed for the applied 75 unique ownership paths. All original 72 entries and the original 65 tasks, 16 batches and 17 waves remain preserved. Root dependency validation reports 87 acyclic combined nodes with no unknown dependency; attachment changes add no DAG edge. Existing shared regression assertions and QA ownership remain protected.

During integration, I is explicitly approved to replace only proposal-status wording with “accepted technical contract” and this review reference. Preserve all source verification, operational approval, production refusal and finding-status caveats. Do not leave a normative accepted appendix labeled unapproved. Future implementation must still prove the exact wire protocol through permanent producer RED, new-tool guards, affected GREEN, actual SDK rehearsal and independent review. No finding is CLOSED.

| Proposed document | Baseline SHA-256 | v2 candidate SHA-256 |
|---|---|---|
| `docs/contracts/firebase-data-contract.md` | `b8ee533155f50018b3b18ad158d95e426c533f648b27f25ba5fbddd92fdd3340` | `cda7fee7f7fcd1531e6a47827674e23f77d717328d51b8eff15b74eac3e915e1` |
| `docs/operations/background-consistency-migrations.md` | `3f4a607fab2528c78da69b935e66c31798e72cf1f4fee7d80dac42f84ebf98ea` | `548fadb413a349d2a8f12a26464859fe4343a9b3947685a65cc665372400ad27` |
| `docs/decisions/0006-background-consistency-and-schedule-timezones.md` | `6e0f649906118111fcd01d0605e6d9dcaeb1ec4a9b30da089dc94c64674c2f4e` | `0e108e902ff9ae842f0d9fd65e310577fdcc254c26ca8a29d32d743ebecd1884` |


### Accepted integration confirmation

Accepted-wording patch SHA-256: `d69e88f8` (coordinator-reported prefix). Independently compared the integrated appendices with v2: only approved status/reference language differs; technical semantics and every source/runtime/production safety boundary remain. The original v1/v2 hashes remain above. Implementation may proceed under the existing registered owners and mandatory tests; no task or finding is marked complete.

| Integrated document | SHA-256 |
|---|---|
| `docs/contracts/firebase-data-contract.md` | `82d538b5ea862b5199d0098392ba45c8d88bc682793c19992e655bb3f1cab79b` |
| `docs/operations/background-consistency-migrations.md` | `12cc41ecfdaeda08a48c82b76882637d90bcc32ae85a7ab767ca2ff27bf967c8` |
| `docs/decisions/0006-background-consistency-and-schedule-timezones.md` | `a0ee1703396d62da4111af8ffe2d8eeffdefcc0835d7ffc7a56d17a32221689c` |
