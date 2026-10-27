# B16 wire contract review

Status: **BLOCKED — revise the two wire-contract findings below before approval.**

This independent review concerns the proposed contract only. It does not release
B16 before B15, authorize implementation, approve a migration/deployment, or close
R13. The reviewer did not author the proposal or the notifier/delivery source.
The existing 65 tasks, 16 batches and 17 waves remain unchanged.

## Reviewed identity and baseline

- Proposal: `/tmp/hudhud-b16-wire-contracts.patch`.
- Exact SHA-256: `16d744953c9c42ca1da9688d0a5fc8245c4821257eed83d483f61ddc95067d52`.
- Supporting inputs: `/tmp/hudhud-b16-wire-note.md` and
  `/tmp/hudhud-b16-wire-provenance.json`.
- Current `git apply --check` passed, exit 0. All four baseline hashes match the
  supplied provenance. Reconstruction from the four append-only hunks also
  reproduces every candidate hash. No baseline drift or source hunk was found.
- Repository changes from this review: this report only. No proposal integration,
  source/test edit, emulator, Flutter run, network send, migration or deployment.

| Proposed document | Verified baseline SHA-256 | Verified candidate SHA-256 |
|---|---|---|
| `docs/contracts/firebase-data-contract.md` | `dcaa2744284a68deb53c79f22a977f5040df554c783e08c7cef8c0f00477a800` | `e18e29c382f7467f7804e0d7a8ab36d5b2c454bc4ebf74674815496aeff1ae28` |
| `docs/contracts/content-automation-contract.md` | `bbc5878abac0e308fe7f1185d3953ae20b686bd9d7a1e92bf652ad0959025997` | `b2d66088d00a6ea046ef47433870dfc6605a5435dfa7205b12b7d4056a3e4e31` |
| `docs/decisions/0006-background-consistency-and-schedule-timezones.md` | `305be032603556ac7280c5ebdc43bb5912ac91f9e18e7d09fcf846ad8ec931e9` | `ec3f7c43a5618fa16c3ef4ce2eb5d6738a7bbe7f91fdba2c7d24a14c1c9923ee` |
| `docs/operations/background-consistency-migrations.md` | `2fb8f74b85fe0f42aae584e9f0745cfe82bd2629d30bb1884c97bb283ab4213d` | `440b1734e7f70b396ac3389c2d5c847240717cb0114d72d0648c7183fb38cca0` |

## Blocking findings

### B16-W01 — High: legacy prepared work and failed delivery need a precise state matrix

Affected proposal: `/tmp/hudhud-b16-wire-data.md:111–115` and the handoff note's
statement that all pending work is held. The approved automation contract
(`docs/contracts/content-automation-contract.md`, “Program eligibility and durable
occurrence identity”) explicitly preserves pending phases, leases and backoff;
its conservative terminal suppression applies to sent/unknown or ambiguous
sending, rather than every prepared operation.

Actual `functions/lib/notification-delivery.js:26–43` distinguishes these states:
expired `pending/claimed` is reclaimable while the receipt has not expired;
expired `pending/sending` becomes unknown and cannot retry. The permanent
“expired prepared work can be reclaimed” test in
`functions/test/notification-delivery.test.js` documents that distinction.
`program-notifications.js:167–170` also records a pre-send preparation failure as
failed/retryable. Provider failures include both retryable and nonretryable
classes, and `claimDelivery` honors their retryAt/expiry constraints.

The draft instead sends **any** pending/claimed receipt to suppression/review,
without a bounded release condition. The migration can then make a provably
never-started occurrence permanently unknown, dropping a legitimate delivery
outside the approved ambiguous-send policy. Conversely, “definite rejection may
be unsent” does not explicitly prevent a fresh V2 key from bypassing a legacy
failed/nonretryable decision, backoff or expiry. Being provably unsent alone is
not permission to retry.

Required revision: define the complete legacy-to-V2 decision table, including
valid legacy receipts with no fingerprint (the actual V1 program caller never
provided one). At minimum distinguish active versus expired claimed ownership,
proved quiesced/pre-send work versus sending ambiguity, known failed/preparation,
retryable rejection before/after retryAt, nonretryable failure, expiry, malformed
state and missing historical evidence. Keep live/ambiguous ownership deferred,
never infer unsent from lease expiry for sending, and require actual isolation,
exact CAS and fresh eligibility before any safe prepared-work recovery. Preserve
nonretryable/backoff/expiry meaning. Do not permanently terminalize known safe
prepared work merely because its phase is claimed. Name the scope in which
missing evidence is historical and held versus a fresh no-op; a clear no-op
still grants no send without the runtime validation.

Acceptance for the revised contract: deterministic rows and later regressions
must prove both no replay of sent/unknown/ambiguous sending **and** no loss of a
provably unsent, otherwise eligible prepared/retryable occurrence. No previous-day
product policy or change to other senders is needed.

### B16-W02 — Medium: sorted parallel arrays conflict with positional key mapping

Affected proposal: `/tmp/hudhud-b16-wire-data.md:67` requires legacyDates and
legacyKeys to be sorted, distinct and positionally corresponding. Independently
sorted SHA-256 hashes do not preserve chronological date order.

Concrete calculation using the exact proposed/current V1 UTF-8 JSON tuple:

| Program | Yemen date | V1 key |
|---|---|---|
| `wire-review-4` | `2026-10-26` | `67b46c21aaa6afb1c10f7093da14ec8379939090627bfa43e9ac6925f65f5601` |
| `wire-review-4` | `2026-10-27` | `43d1a107e43ba6820e0eb364baa1cce52a99cbd662ec52f8177cd8a526125588` |

The dates ascend while their corresponding hashes descend. Sorting both arrays
silently associates the wrong evidence with a date, or makes a valid two-date
mapping fail strict validation.

Required revision: sort/deduplicate dates and derive each key at the same index;
keys are distinct but **not independently sorted**. Alternatively define
canonical `{date,key}` entries sorted only by date. Specify the chosen encoding
unambiguously and retain this counterexample in later validation tests. No new
collection or dependency is required.

## Technical assessment of the remaining proposal

- **Keys and fingerprint:** H of compact UTF-8 JSON arrays, lowercase SHA-256,
  V1 `[programId,YemenDate]`, V2 `['program-start-v2',programId,localDate]` match the
  source V1 encoding and approved scoped V2 design. The complete normalized
  schedule/station/active tuple binds one intent without a schedule edit creating
  another occurrence key. Strict missing/invalid accepted fields fail closed.
- **Time:** the explicit canonical UTC cutoff is an operational input, not a
  fabricated activation/send authority. Fixed offsets and the same-local-day
  inclusive 0..10-minute rule are retained; no previous-day lead is introduced.
  Half-open local-day intervals intersect one or two Yemen days correctly:
  +180 maps D only; offset 0 maps D and D+1; +840 maps D-1 and D. Boundary-only
  intersection is excluded. Implementers must reject derived UTC/Yemen endpoints
  outside Firestore years 0001..9999, and test early years without JavaScript's
  Date.UTC year-0..99 coercion. Inclusive ranges must remain at most 31 local days.
- **Actual start boundary:** adding only optional read-only validation to the
  existing startDelivery transaction closes the present separate-preparation
  race at `program-notifications.js:141–153`. All reads precede the receipt write;
  retries replace prepared payload and produce no external side effect. A
  present validator must positively authorize the current payload; false,
  throwing or malformed outcomes cannot authorize a send. Default-absent
  episode/broadcast behavior and returned boolean stay unchanged.
- **Private schema and versions:** terminal unknown/nonretryable suppression is
  not a fabricated send. Existing sent/unknown stays byte-preserved even on
  fingerprint conflict. Receipt SDK Timestamps and exact native create/update
  versions are distinguished from safe epoch-ms operational leases. New target
  update versions and item committedAt can use the same atomic server timestamp,
  then be verified against native snapshot versions; preserved targets retain
  their earlier exact versions. Before/after hashes must use the existing typed,
  nanosecond-preserving canonical encoder. Specify item index padding in the
  implementation, then freeze it in the versioned wire tests.
- **Retention:** the current collector (`program-notifications.js:180–187`)
  deletes every first20 expired record regardless of purpose. The proposed
  server-side bounded broadcast-prefix selection is therefore necessary; merely
  skipping held records after limit20 would starve cleanup. Retain raw program
  keys, sent/unknown/ambiguous lineage, jobs and child receipts independently of
  backup expiry. Test actual SDK query/index shape before any additive index;
  no deployed-index readiness follows from this review. The existing broadcast_
  key prefix is confirmed in `user-management.js`; episode cleanup is separate.
- **Stamps and rollback:** conditional create-identity/schedule-matching v2 stamps
  after acknowledgement, no date regression, and receipt authority across stamp
  failure follow the approved design. Rollback holds rather than deletes or
  weakens suppression; it cannot revive a program, reset stamps, reopen an old
  pending/failed state, or resume an unaware old notifier/collector.
- **Permissions and feasibility:** the proposed notificationOperations paths and
  nested items are outside current broad comment/report/favorite/subscription
  group allows, so the default-denied private schema is preserved. Both-root
  get/list/create/update/delete guards remain required, including forged claims.
  The supported server/Admin SDK demo-loopback factory and private binding from
  B13 are feasible precedents; this must not become a client-SDK Rules bypass.
  At most25 serial occurrence transactions with at most2 V1/1 V2 point reads,
  immutable typed manifests, externally held AES-GCM backups, inside-checkpoint
  custody/expiry verification and exact commit receipts reuse existing patterns.
  Production mutation must fail before SDK initialization until independently
  reviewed real old/new worker and collector quiescence/drain exists. A caller
  flag, lease, manifest or claimed hash never substitutes for that proof.

## Source identity and next gate

The following source hashes were inspected; no source was modified:

| Source | SHA-256 |
|---|---|
| `functions/lib/program-notifications.js` | `26f4485e5cbca1a8577c6e4d5799da2ad8475393e249e6a45e4c76a41de954b9` |
| `functions/lib/notification-delivery.js` | `3d44097a19484335bc0f2145c0c334ed95d3a1dcacd23aece3909de2555f881f` |
| `functions/lib/episode-alerts.js` | `d33233b6578e38a3d49aea01a8279f4404181f78c70328a8ad0352088f91a729` |
| `functions/lib/user-management.js` | `d60d814861ff2b095b03ba82e110da2517bc8bce2aa6e5032f30d2fbd604ed59` |
| `firestore.rules` | `29feef1c8026085a21bc24aa129ecbead46425cf1876d627e4a992ada692a562` |

Revise W01/W02, refresh all proposal/baseline/candidate hashes and request an
independent re-review. Afterwards, implementation still waits for B16 eligibility
and all B15 prerequisites, ordinary behavioral RED/GREEN, shared caller tests,
Rules guards and exact-candidate independent review. Historical 17 emulator
obligations, final Flutter/device acceptance and separately authorized production
checkpoints remain. This report runs no acceptance suite and closes no finding.


## Independent re-review — revised proposal W01/W02

**Latest status: APPROVED for the revised wire-contract proposal only.** This
supersedes the earlier BLOCKED outcome solely for patch
`4116d080ac8773e743c620ce99f4a68e8ab7c38549099a53214bd796e873900d`.
The earlier findings and proposal hash remain above as historical review evidence.
No application finding is closed, no source fix is verified, and B16 source work
still cannot start before B15 and the remaining batch prerequisites.

The refreshed note/provenance and all four revised append-only document hunks
were read against the actual unchanged notifier, shared delivery implementation,
episode and broadcast callers. Current `git apply --check` again passed, exit 0.
All four baseline hashes still match the first-review baseline; reconstructed
candidate hashes match the refreshed provenance exactly:

| Revised candidate | SHA-256 |
|---|---|
| `docs/contracts/firebase-data-contract.md` | `3cbb77f9ba91f8d0e555dc501be822c0b23aa214df7ec4c86dee48a7e731159c` |
| `docs/contracts/content-automation-contract.md` | `dd2c1eddf0e8b838000828cc81a5e1a6f27d0c97c4c9abf03be30404209b3f8f` |
| `docs/decisions/0006-background-consistency-and-schedule-timezones.md` | `44fa0349162d1e464e69b238463a7b878eb901db41971b5ae57eabaa0622eee2` |
| `docs/operations/background-consistency-migrations.md` | `9366bd652c7c665c92b98704e747fd7e5b26a0e992f5697b4b509716f8e93ca4` |

### W01 assessment

The revised ordered table now preserves the actual shared-protocol precedence:

- A live claimed lease defers rather than permanently suppressing prepared work;
  after verified worker quiescence it can be carried unchanged, and shared claim
  still respects its remaining lease.
- An expired claimed lease with an unexpired receipt permits the proved-safe
  carry/reclaim path, retaining original attempts and clocks. Reclaim increments
  the inherited attempt counter once; it does not create a new24-hour lifetime.
- A sending lease remains ambiguous: live work defers until drained, and expired
  sending suppresses as unknown. Lease expiry never proves that a provider call
  did not happen.
- Known retryable failures retain original retryAt, attempts, expiry and allowed
  failure reasons. Before-backoff remains deferred, due/unexpired work can reclaim,
  and nonretryable or expired outcomes cannot escape through a fresh V2 key.
- Missing V1 fingerprint alone is accepted, matching the real program caller.
  Unknown present bindings, malformed state and changed source versions remain
  review blockers rather than guessed rebinding.
- Safe carry requires exactly one unambiguous source, an absent V2, actual
  quiescence/drain and exact source/create/update CAS. Restrictive evidence in
  any overlapping alias dominates a recoverable alias; conflicting existing V2
  or multiple owners block preview rather than silently merge attempts/clocks.
- Historical missing evidence versus current/future no-op is now classified
  against the explicit cutoff and the same local eligibility window. Neither
  a clear no-op nor a copied prepared state alone grants a send.

The new inline lineage requirement addresses a real source detail: current
`claimDelivery` uses tx.set with a fixed field set, so naive carry metadata would
otherwise disappear on reclaim. The revision explicitly requires preserving only
that programCompatibility field byte-for-byte on a fingerprint-bound program
carry, without adding a claim argument or generic metadata mechanism. At actual
start, fresh V1 versions, original retry/expiry constraints, inherited attempt
floor and current schedule/parent eligibility must still be checked. That is a
feasible narrow implementation change under the registered shared-file lock;
other senders without this field keep their existing document shape and defaults.

I found no remaining contract-level lost-retry or fresh-key bypass in the revised
matrix. This is approval of the specified behavior, not evidence that code
currently implements the carry, atomic validator or preservation rules.

### W02 assessment

Dates alone are now sorted/deduplicated. Each legacyKeys[i] is derived and
validated as H([programId,legacyDates[i]]), and hashes are explicitly never
independently sorted. The exact wire-review-4 counterexample from the first
review is retained for permanent tests. Item receipt indexes are also now fixed
to three digits000..024. The contradictory positional invariant is removed.

### Safeguards and implementation gates retained

Key/fingerprint tuples, fixed-offset same-local-day0..10 eligibility, half-open
Yemen overlap mapping, native version versus epoch-ms lease distinction,
conditional acknowledged stamps, read-only actual-start validation, terminal
receipt authority, raw-program retention and separate bounded broadcast cleanup
remain as reviewed. Derived calendar endpoints outside native years0001..9999
are now explicitly rejected; year0..99 arithmetic has a required regression.

Private default-deny, frozen demo SDK binding, immutable external AEAD backup,
inside-checkpoint custody/expiry/CAS, at-most25 serial occurrences and31 local
days, immutable receipts and non-erasing rollback remain. Production mutation
still refuses without real independently proven worker/collector isolation;
an operator boolean, job lease or manifest is insufficient. No new collection,
dependency, service, task, batch, wave or previous-day product policy appears.

Implementation acceptance must prove the ordered state rows, original retryAt/
expiry/attempts and lineage across shared reclaim; V1 missing fingerprint;
multi-source conflicts; changed/recreated sources; the decreasing-hash example;
all terminal/ambiguous and rollback preservation; actual start races; and unchanged
episode/broadcast callers. The present validator must fail closed unless current
transaction snapshots positively authorize the matching payload. Retention query
and any index still need actual SDK/source verification and later deployment
readiness; this review does not establish either.

All five source hashes in the earlier source table remain unchanged at this
re-review. Only this report was appended. No tests, E/F, network sends, migration,
source modification or proposal integration occurred. R13 remains OPEN; historical
17 emulator obligations, full Flutter/device acceptance, independent source review
and later production approvals remain required.
