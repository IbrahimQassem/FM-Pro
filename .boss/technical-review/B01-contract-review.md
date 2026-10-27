# B01 contract review and scoped handoffs

Baseline: c304e85. The user approved the complete existing plan, per-schedule UTC-offset alerts, dual page/resumable dataset search and repair-and-rerun within an active batch. All amendments are English and preserve the existing architecture/dependencies.

The architect supplied patches; I alone applied shared contract changes. Independent reviewer `contract_acceptance_review` approved C03, C04-RSS, C04-HEALTH and C04-TIMEZONE, then initially withheld C04-COUNTS for an incomplete episode-identity freeze. The revised fence contract was independently approved after covering all owned transaction/Rules writers, stable ID/createTime inventory and a second exhausted enumeration, fail-closed lease recovery, retryable paused events and count-reset producer paths. Production mutation remains refused pending separately reviewed external platform isolation. No contract approval is source-fix, test or production evidence.

C03 explicitly loads an active-program page followed by the selected/first program's episode page. Partial parent pages are never proof of invalid episodes; direct links use direct validated lookup. Program order preserves featured/priority/title with ID tie-breaker. All existing request/document/render budgets remain mandatory.

The early Rules output M04-T12-FENCE-READY is part of existing04-T12, not a new task/batch/wave. It depends only on C04-COUNTS, precedes04-T08/09 rehearsal, and cannot depend on full04-T12 completion. Independent graph inspection:65tasks,16batches,17waves;86acyclictask/milestone/checkpointnodes; no missing references. Original33owner assignments are retained; current48entries explicitly cover necessary additive paths.

Maintenance fencing generation is distinct from retained per-episode baseline generation: releasing/recovering the fence must not invalidate accepted contribution ledgers. Source implementation and tests must prove that distinction.

## Reviewed contract hashes

- `docs/contracts/station-content-contract.md`: `d1aede9273f2cb2e75555bb7e62fb3ffcd149efef599525ad7bc17affb771abe`
- `docs/contracts/firebase-data-contract.md`: `26826b3ac23492955a1888601e1ab203c56aa41b50bfcf8ba6724397d1efb249`
- `docs/contracts/content-automation-contract.md`: `32473fcaa15469430bf95c935ee2f87c4afddd90ea307be869056b74aea68ad5`
- `docs/decisions/0004-public-web-accounts-and-discovery.md`: `dc7a03dfa964a54747fdd8835908b98f162ed901c10a01dfd03f65517f5833fb`
- `docs/decisions/0006-background-consistency-and-schedule-timezones.md`: `4f7922052f63fd49f9c16af73712cb43cbea917a0cb83a1987a7959c231d6eb6`

## Remaining gates

No production activation, index deployment, receipt migration or data backfill was performed. R01–R13 remain OPEN. Code batches, independent code reviews, exact-candidate integration, physical-device acceptance and operational readiness must still pass. Production CLI refusal is an explicit operational limitation, not production readiness.
