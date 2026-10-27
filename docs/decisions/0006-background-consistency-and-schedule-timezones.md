# ADR 0006 — Background consistency and schedule offsets

Date: 2026-10-26. Status: user-approved policy direction; independent contract
review and implementation gates required. Scope: C03 and C04 outputs of B01;
no deployment, migration apply, live notification or finding closure is authorized.

## Decision and evidence

Keep the existing Flutter/Riverpod, React/Vite, Firebase/Node22 ESM and direct
Firestore architecture. No new framework, parser/search service, state manager or
package is introduced. Governing details live in the amended station-content,
Firebase-data and content-automation contracts; C01 remains unchanged.

| Choice | Alternative considered | Decision and concrete reason |
|---|---|---|
| SDK query pages with scoped value cursors | Download then locally sort/filter archives | Server filters/order precede bounded reads; fixes lost late published entries and memory growth without a new service. |
| Page search plus explicit resumable 200-document scans | Pretend Firestore supports arbitrary full-text contains | Preserves existing match behavior and reachability while exposing scan cost/incompleteness honestly. User selected the two modes. |
| Fresh-state contribution ledger | Aggregate then overwrite, or independent decrement paths | Duplicate/out-of-order events and concurrent moderation/deletion need one transactional authority. |
| Enforced scoped write quiescence for legacy baseline | New online revision-barrier protocol | Uses existing operational pause/manifest safeguards; avoids an unproven concurrent baseline abstraction. Live activation stays blocked until all writers are actually quiesced and rehearsed. |
| Per-schedule fixed UTC offsets | Force every accepted schedule to Yemen time | User chose honoring existing accepted offsets. This retains the content model and aligns UI status with alerts without adding DST/IANA semantics. |
| Existing claim/start/finish with fingerprint and optional atomic validator | Duplicate delivery state machine in the notifier | Preserves other sender contracts and closes the prepare/start schedule-edit race at the existing authority. |

Repository evidence: Flutter currently sorts featured/priority/title; public web
currently sorts program priority/title and episode date/title; ordered pages must
make that compatibility difference explicit. Current Rules create comments as
published, while old automation prose says pending; preserve source behavior.
The current notifier ignores accepted offsets and existing receipt keys use Yemen
dates. `claimDelivery` already supports fingerprints; `startDelivery` does not yet
read the program in its receipt-start transaction.

Firestore ordering omits records missing ordered fields, so field audit/repair
and additive-index readiness precede ordered production activation. See
[official ordering documentation](https://firebase.google.com/docs/firestore/query-data/order-limit-data).
Use complete ordered cursor tuples to disambiguate page boundaries; see
[official cursor documentation](https://firebase.google.com/docs/firestore/query-data/query-cursors).
Trigger ordering is not guaranteed and delivery is at least once, which requires
idempotent fresh-state workers; see
[official event documentation](https://firebase.google.com/docs/functions/firestore-events).

## Contract outputs and implementation interfaces

- **C03:** programs `featured DESC, priority DESC, title ASC, ID ASC`; episodes
  `broadcastAt DESC, priority DESC, ID ASC`; 50 items/51 raw documents; scoped
  opaque value cursors; cache/server separation; three-read direct links; private
  bounded export enrichment; root-only aggregate response `{root,total,asOf}`.
- **C04-RSS:** exactly-once XML entity decoding, no DTD/external resolution,
  raw/decoded alias conflict detection, existing episode identity preservation,
  bounded preview/repair with no publication/counter/send side effects.
- **C04-HEALTH:** root budget 100 seconds, invocation reserve 40 seconds,
  pair admission 16+10 seconds, 120-second owned lease, document-ID pages at most
  50, generation-safe progress and distinct checkpoint/heartbeat write evidence.
- **C04-COUNTS:** private root activation, per-episode generation and per-comment
  0/1 contribution; published creation retained; atomic fresh-state delta owner;
  complete quiesced baseline before activation; delayed-event-safe tombstones and
  conditional cleanup/restore that cannot recreate content.
- **C04-TIMEZONE:** offset-derived local occurrence, immutable schedule fingerprint,
  existing delivery states and conservative overlapping legacy-day suppression.
  Optional transactional validation on existing `startDelivery` is the only shared
  delivery-source interface addition; I must register its B16 ownership amendment.

C03 approval releases pagination work. Each C04 output can be reviewed/released
independently; no unrelated batch waits for complete timezone/cutover rollout.
These output handoffs do not mark all of B01 or any finding complete by themselves.

## Acceptance and operational separation

Retain 65 traceable tasks, 16 batches and 17 waves. Test both roots and role
matrices, late/missing/equal-sort records, bounded scans/exports, replay/concurrency,
lease expiry, deleted/reused identities, malformed entities and receipt ambiguity.
Use the real count handler with synthetic moderation; no manually seeded expected
count substitutes for a new-comment journey. Observe the exact-candidate review
and integration gates in the execution package.

Migration tools default preview, one explicit project/root/scope, reviewed versioned
manifest, immutable private durable backup verified before writes, bounded
transactions, owned resume and conditional safe restore. Do not restore C01
private fields publicly, recreate removed content, or replay sent/unknown delivery.
Production cutover day, backup destination/retention and deployed-index readiness
remain concrete later operational approval inputs; code must not invent them.

All findings remain OPEN until their own verified acceptance and applicable
operational criteria are met. This ADR is not a test result or live activation.

## C04-COUNTS review revision — enforceable maintenance, 2026-10-26

The chosen quiescence alternative is an enforced root fence, not operator
attestation: the existing root count activation document is read inside every
owned episode/comment mutation transaction and in comment-create Rules. Initial
cutover freezes episode creation/deletion/ID reuse too. Frozen episode identity
inventory records stable ID and trustworthy createTime, is exhausted to EOF and
re-enumerated with the same digest/count before atomic activation. Paused events
remain retryable, and an expired maintenance lease never opens writes.

This is one narrow maintenance helper shared by established write boundaries,
not a generic lock framework or a second count authority. Apply/restore/activation
CLI execution is currently limited to explicit local demo emulators. Arbitrary
unowned Admin SDK writers cannot be fenced by a Firestore field; supported
platform-enforced isolation remains an external, unimplemented G-O4-READY input.
Production mutation refuses that unsupported mode rather than accepting a
boolean proof or guessing that old workers have drained.

Before B15 code dispatch, I registers the following owned source/test amendments.
All existing shared owners remain; new cross-batch paths receive I ownership.
Atomic task IDs, 65-task traceability and 16 batches remain intact; broad writer
coverage is an explicit necessary R12 write-set exception, not unowned scope.

| Task | Additional or strengthened boundary |
|---|---|
| 04-T06 | New dependency-free `functions/lib/comment-count-maintenance.js`; guard/count cases in already-planned `functions/test/comment-counts.test.js`; current `comment-moderation.js` fallback writes must not bypass transactions/fence. |
| 04-T07 | Add `functions/lib/editorial-audit.js` and `functions/lib/rss-ingestion.js`; keep `index.js`, `admin-content-delete.js`, `admin-report-review.js` guards in their already-owned paths. Add `functions/test/editorial-audit.test.js` and `functions/test/rss-ingestion.test.js` to the task write set. Existing `functions/test/admin-content-delete.test.js`, `functions/test/admin-report-review.test.js`, `functions/test/comment-moderation.test.js` and account-deletion emulator cases retain their named owners and gain fence/race cases. |
| 04-T08 | Extend the already-planned real worker/harness fixtures to prove pause rejection, in-flight conflict/retry, event resumption and no premature acknowledgement in both roots. |
| 04-T09 | Add `tool/import_programs_and_episodes.mjs`, `tool/firebase_seed/seed.mjs`, `tool/firebase_seed/migrate_comment_status.mjs`, `tool/seed-admin-preview.mjs`; add tool-producer guards to already-planned `tool/test/reconcile_comment_counts.test.mjs`. Existing-count preservation is required in merge-style import/preview writers. Add fence reads to owned `tool/repair_rss_urls.mjs` and `tool/backfill_content_pagination.mjs` mutation transactions after their earlier batch handoffs; no new tool dependencies. |
| 04-T12 | Existing Rules and Rules/emulator write sets prove paused comment-create denial plus private maintenance denial for every role; strengthen rather than postpone the boundary needed by T08/T09 rehearsal. |

Inventory-only import generators and geography-only station/location tools do not
mutate episode/comment identities/status/counts and need no count fence. Synthetic
fixture seeding must finish before freeze; fixture Admin SDK bypass is used only
as an adversarial drift test, never as evidence that production isolation exists.

Acceptance adds pauses racing each actual writer; both-root create/delete/recreate
between inventory pages; legacy migration/preview count reset prevention; each
crash before/after final verification/activation; and unsupported production mode
rejection with zero writes. Conditional recovery cannot restore stale moderation,
removed content, a different create-time generation or C01-prohibited fields.


## C04-COUNTS early Rules clarification — proposed independent review

M04-T12-FENCE-READY retains its two-file Rules/test source write set. The exact
shared root-fence field types are defined in the Firebase data contract: version1,
paused/active state, safe positive generation, opaque owner, reviewed planHash,
safe epoch-ms operational lease, writerProtocol1, and for active state a native
Firestore Timestamp `activeFrom` from the trusted activation commit plus
`baselineManifestHash`. A missing fence allows legacy normal flow; malformed or
paused fences fail closed. Lease expiry never opens a paused root. This does not
complete04-T12, B15, B16 or activate a root.

Refine the unreleased private ledger leaf collection from planned `comments` to
`contributions`: `{root}/commentCountContributions/episodes/{episodeId}/contributions/{commentId}`.
The planned `comments` name overlaps existing administrator collection-group list
Rules. Preserve canonical public comment audit queries and existing reservation
read policy; avoid a broad recursive Rules rewrite. No count ledger source/data
implementation or authorized live migration exists at this handoff. Every later
authorized count maintenance, reconciliation, apply, restore or activation scope
must first audit the old planned namespace with bounded read-only preflight and
refuse mutation/activation if records exist. Normal event/writer transactions do
not scan the entire ledger. There is no automatic rename or deletion.

Independent technical/security approval of this field-type/namespace clarification
precedes the milestone handoff. Keep the initial old-path synthetic leak evidence
and genuine paused-create baseline RED. New namespace default-deny tests may
already be GREEN and must not be described as newly fixed vulnerabilities.
Task/batch/wave counts remain65/16/17, with existing shared ownership and later
server writer, baseline, inventory, review and production approval gates intact.


## C04-COUNTS cutover precondition clarification — proposed independent review

The absent-fence legacy permission and the requirement for an accepted count
baseline govern different things. OLD deployment may continue legacy normal flow
while no fence exists; NEW count-aware normal traffic must be enabled only after
verified isolation, pause, complete frozen inventory/baseline verification and
atomic activation. Missing/unknown/unfinished baseline in new handlers produces
retry or atomic precondition failure, without guessing contribution, unsafe recount,
clamp or alternate UI. Rules absent-root published creation remains unchanged;
correctly sequenced cutover confines unavailability to the already-approved
maintenance quiescence. Current production mode remains unsupported without the
required independently verified old/unowned-writer isolation.

Root maintenance lease generation and opaque episode baseline generation are
separate. Existing private per-episode/completion records bind accepted lineage,
exact native createTime and contribution generation; lease recovery or activation
must not invalidate accepted data merely because root generation increments.
New post-activation empty baseline and canonical zero counter are established in
the episode creation transaction, bound to the native commit identity, not guessed
on the first event. Final root release binds the verified paused-barrier native metadata as activeFrom.

Rollback preserves pause/isolation until compatible authority and any required
reviewed rebaseline are ready; never reopen old unsafe writers over active ledgers.
The Firebase data contract specifies the state matrix and ordered prerequisites.
Independent review precedes B15 implementation. No new service/collection, task,
batch, wave, product policy, production mutation or finding closure is introduced.

## C04-TIMEZONE B16 wire refinement — proposed independent review

The approved per-schedule UTC-offset decision is unchanged. Resolve implementation
wire details in the data contract: deterministic array fingerprint; exact V1/V2
keys; half-open local-day/Yemen-day mapping; conditional local/version2 stamps;
read-only optional start validation; terminal compatibility suppression and bounded
private jobs/receipts within notificationOperations. Preserve the existing same-
local-day0..10 minute predicate, avoiding an unapproved new previous-day lead flow.

Retain all sent/unknown/ambiguous program delivery evidence. Shared broadcast/
episode defaults remain unchanged, including bounded broadcast cleanup isolated
from held raw program keys. Never replace receipt authority with an operator flag,
expiry, compatibility stamp or a migration's claim of a successful send. Rollback
preserves suppression and quiescence rather than deleting evidence or reopening
old workers. Current production apply/restore remains unsupported until actual
old/new workers and collector are externally quiesced/drained and independently
verified. Use the already-reviewed demo SDK binding, immutable encrypted backup,
inside-checkpoint custody/expiry/CAS and commit-version receipts patterns from
B10/B13; no generic migration framework or dependency is introduced.

Native item receipt amendment — accepted technical contract: the migration
changes only an occurrence's V2 receipt or preserves it as a no-op. Persist exact
observed pre-write targetCreateTime/targetUpdateTime plus targetChanged; do not
persist a guessed future committedAt or require a serverTimestamp transform to
equal native metadata. The original immutable item snapshot.updateTime proves
same-transaction changed-target commit and new-target creation. Existing targets
retain their known create identity; preserved/no-op targets retain literal observed
versions or proven absence. Require exact postcommit readback and matching receipt
recovery after unknown ACK; equal-value ABA/delete-recreate never becomes new
permission. Conditional rollback remains non-erasing and held. The data contract
defines the precise wire cases without a new collection, helper framework or change
to shared delivery callers. This corrects only native evidence, not offset policy,
key/fingerprint tuples, state-carry clocks or SENT/UNKNOWN suppression.

Independent native-receipt approval: `.boss/technical-review/B16-native-receipts-contract-review.md`.

This accepted amendment does not start B16 before B15, authorize production or close R13.
Independent wire review and ordinary behavioral RED/GREEN remain prerequisites.

Independent W01/W02 revision preserves expired pending/claimed reclaim and known
retryable failures under the shared lease/backoff/expiry protocol. Quiesced exact
source-state carry to absent V2 retains original attempts/clocks; no fresh-key
bypass or blanket prepared-work unknown conversion. Date/key arrays sort only
by date, deriving each corresponding hash in place. See the exact ordered matrix
and reversed-hash counterexample in the data contract.


## Native timestamp receipt clarification — proposed independent review

The precision regressions exposed an invalid assumption in the early B15 prototype:
REQUEST_TIME/serverTimestamp transforms have millisecond precision, so they cannot
be equated to finer native document create/update metadata. Retain both permanent
RED cases and block first bootstrap consumption until this clarification and its
source correction are independently reviewed.

Creation-origin baselines use their own immutable native updateTime as the
same-transaction episode birth receipt, compared exactly with parent createTime.
Rewritten/recovered baselines use explicit literal verified createTime under
origin=baseline; never rewrite origin=creation and call its new version the old
birth. Contribution rows distinguish observed native comment version from an
atomic mutation receipt and handle genuine no-op writes without assuming transform
precision. Native activation is a paused barrier followed by guarded atomic release
binding that exact native timestamp. The data contract names persisted barrier
fields, readback checks and recovery constraints. No legal writer may run in the
fenced gap, and old accepted lineage is retained on recovery.

This uses existing private root/per-episode/contribution records, adds no mapping
service/collection, does not authorize production isolation, and changes neither
arithmetic ownership nor normal product flow. All original cutover, backup,
conditional recovery, independent review and acceptance gates remain mandatory.


### B15 nonempty persistence accepted technical contract

Keep the existing root fence and per-episode count authority. The concrete
full04-T09 protocol is specified in the data contract's B15 nonempty persistence
section: subordinate private maintenance plan/episode records and immutable unit
receipts, bounded post-pause ID/native-createTime inventory, complete current-comment
plus historical-contribution/tombstone union, explicit data generation, exhausted
second verification and native paused barrier/release. No new public collection,
service, dependency or ordinary-writer bypass is introduced.

Receipts bind exact native target versions and purpose-bound encrypted preimages;
no-op writes retain observed versions rather than borrowing receipt metadata.
Rollback converts verified historical native receipts before private-record rewrite
and only conditionally restores owned counters/ledger. It ends paused/restored-held,
never automatic legacy-worker release. Bounded scans rely on the approved fenced
writer isolation; they cannot prove absence of an arbitrary unguarded Admin SDK
edit after verification. Consequently production remains unsupported/refused.
Independent approval is recorded in
`.boss/technical-review/B15-nonempty-contract-review.md`; implementation and runtime
acceptance gates remain separate.


Source CAS is separate from immutable ID/createTime inventory identity. Bounded
per-target heads in the existing private units collection link immutable apply
and reverse-restore receipts; current physical target versions follow the latest
proven head, not stale predecessor metadata. Chain validation and receipt queries
remain bounded across calls and exclude head IDs from numeric receipt enumeration.


### Full04-T09 historical proof and bounded replay clarification

Independently approved in
`.boss/technical-review/B15-replay-budget-contract-review.md`: accepted replay binds immutable activation/completion,
contiguous receipt membership and historical target-head/ancestry proof. It is not
a fresh recount of worker-mutated data. Firestore remains read-only; a purpose-bound
private durable encrypted replay head provides bounded restartable local progress
with lock/predecessor CAS/atomic durable publication, not a caller cursor or service.
Logical work and bounded fixed CAS reads are distinct; aggregate physical read caps
include retries/admission/final checks. Full source CAS before activation and fresh
conditional restore checks remain unchanged. No new collection/dependency/CLI is
introduced and production support remains unavailable.


### Consolidated full04-T09 checkpoint implementation audit

Independently approved in
`.boss/technical-review/B15-checkpoint-audit-review.md`: one fixed-size private plan state covers staging,
source/head/receipt verification, frozen recovery prefix, source recheck and reverse
restore. It preserves accepted per-episode verification/proof immutability. A
one-receipt pending native digest tail makes adjacent barrier/release membership
finite and avoids self-chasing verification. No public count schema, service,
collection or dependency changes; exact fields/transitions are in the data contract.


## B16 T11 no-op immutable receipt identity — proposed independent review

A current-API synthetic regression demonstrates that receipt createTime==updateTime
alone cannot establish an original no-op receipt after identical-data delete/recreate.
The unchanged target's literal native observation must remain authoritative; it
must not borrow the recreated receipt's metadata. This is invalid historical-proof
acceptance, not demonstrated target/count loss or a production operation.

Adopt the data contract's narrowly bounded `receiptVersions` native Timestamp array
(max25 contiguous original receipt identities) and `pendingReceiptIndex` on the
existing private migration job. The occurrence commit changes the job pending/index
and creates the item receipt atomically. Before any independent lease/status rewrite
or next item, a guarded seal verifies their exact same-commit native update/create
identity, source/target/prefix/backup proof and current ownership, then freezes that
literal identity. The last item remains applying+pending until sealed; empty jobs
use []/null. Expired pending ownership can transfer only in the same proof-preserving
seal transaction, never by overwriting the anchor first. Unknown ACK resumes/seals
once; later apply/replay/held rollback verifies every original literal identity.

No item receipt field, target identity rule, collection, dependency, generic service,
public sender behavior or count contract changes. Missing/malformed new checkpoint
fields fail closed. Rollback remains non-erasing and cannot resume old unaware
workers. Production isolation is still unsupported; no caller clock/boolean grants
it. The exact normative states/bounds are in `firebase-data-contract.md` under
“B16 T11 immutable no-op receipt seal”. Independent approval and real SDK verification
are required before source integration/acceptance; this proposal authorizes no
production execution or finding closure.
