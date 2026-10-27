# B15 count cutover contract clarification review

Date: 2026-10-26. Reviewer: independent `b10_review` agent. Scope: proposed three-document clarification only; B15 source is not implemented by this review.

## Verdict

**APPROVED for integration before B15 source implementation**, with the consistency wording below retained in the implementation handoff. No new architecture, product flow, service, collection, dependency, task, batch, wave or production authority is introduced. R12 and all other findings remain OPEN.

Reviewed `/tmp/hudhud-b15-cutover-contracts.patch`, `/tmp/hudhud-b15-cutover-note.md`, `/tmp/hudhud-b15-cutover-preflight.json`, existing C04-COUNTS/ADR0006 and the verified M04 boundary. Independently verified the patch digest, three current baseline document hashes and `git apply --check` success. No application/test source, emulator/Flutter process, migration or deployment was modified/executed.

## Compatibility and safety assessment

1. Absent-fence legacy Rules/application permission and accepted count baseline are different facts. The old deployment may continue existing flow while no fence exists; new count arithmetic must not guess missing contributions. Missing/unknown/unfinished activation in new handlers retries without acknowledging unfinished work, while new count-affecting manual/status/delete transactions fail before mutation. Existing verified published creation remains unchanged at Rules level. Correct cutover supplies the already-required isolated maintenance interval rather than an alternative UI or approval flow.
2. Operational sequencing is coherent: verify guarded code/tooling first; enforce old/unowned writer isolation and client pause; perform exhausted read-only oldnamespace audit; stage and completely verify the frozen ID/createTime inventory while paused; atomically activate trusted native commit lineage; release only compatible guarded traffic. Current production mode remains unsupported without actual isolation evidence. An operator boolean cannot establish safety.
3. Root maintenance generation owns concurrency, while accepted per-episode generation and exact native create identity own contribution data. Existing private episode/completion records carry accepted manifest/root lineage. Root lease recovery/activation cannot invalidate unchanged accepted baselines merely by incrementing the maintenance epoch. Do not derive a data generation by subtracting one or comparing it blindly with root generation.
4. New postactivation episode creation atomically installs its zero counter and empty accepted baseline under the current lineage; native commit identity binds both. The first event cannot lazily guess zero from missing ledger or createTime greater than activeFrom. Delayed events and deleted/recreated IDs cannot inherit a prior episode generation or resurrect content. The implementation must prove exact native create/update identity, not rely on application-created timestamps.
5. Rollback preserves isolation and pause until compatible authority or reviewed rebaseline exists. Releasing old decrement/recount workers over active contribution ledgers, deleting lineage/fences to reopen traffic, clamping or aggregate-overwrite fallback is prohibited. Account-deletion barriers/progress persist until comment cleanup succeeds; Auth is not removed prematurely.

## Wording consistency for integration

The existing frozen-inventory section says to stage each episode's complete ledger "under that same root generation." Read and, when integrating, clarify that phrase as **staging ownership under the current verified root maintenance epoch; each episode's accepted data generation remains distinct**. It must not override the new explicit generation distinction or cause data invalidation on recovery/activation. No new data mapping service is needed.

Oldnamespace auditing is bounded, read-only maintenance/reconciliation/apply/restore/activation preflight to exhaustion, with refusal if any old records exist. It is not an unbounded per-normal-trigger scan. Existing identity, privacy, retry, backup, conditional restore and review obligations remain applicable.

## Implementation acceptance still required

This approval does not verify an authority/helper/worker implementation. B15 must capture genuine baseline behavioral RED before fixes and test absent/paused/unknown/new-code states, every actual guarded writer and retry path, complete inventories and crash/recovery/activation boundaries, native commit identity, lease/data-generation separation, same-ID recreation, duplicate/reordered events, account-deletion barriers and production refusal. Actual both-root worker/Rules integration and independent source/security review remain mandatory. Preserve65 tasks/16 batches/17 waves, original17 skipped identities and global/device obligations. Production rollout/migration/rollback requires its separate checkpoint; no finding is CLOSED.

## Proposal fingerprints

Patch SHA-256: `67e4f73fbee1d2fc017daaeed52219606fa9c8a5dea926bbf920ece6a2f3bc16`.

| Proposed document | Current baseline SHA-256 | Proposed candidate SHA-256 |
|---|---|---|
| `docs/contracts/firebase-data-contract.md` | `c0ad347610b449f8d1e371007c66c87cd8f8f74e83959da59bcec3bc233499e5` | `1994f318f40af18063f8bb972c7d17cbe92ab4840f028d33cdcbf5bc583d2988` |
| `docs/contracts/content-automation-contract.md` | `32473fcaa15469430bf95c935ee2f87c4afddd90ea307be869056b74aea68ad5` | `bbc5878abac0e308fe7f1185d3953ae20b686bd9d7a1e92bf652ad0959025997` |
| `docs/decisions/0006-background-consistency-and-schedule-timezones.md` | `9a053d1c77d129a91d487866bd71eb7723b5b9cf6f1266eea7e2508a56435a85` | `305be032603556ac7280c5ebdc43bb5912ac91f9e18e7d09fcf846ad8ec931e9` |
