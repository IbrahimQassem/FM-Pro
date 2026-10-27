# Background consistency migrations

## R09 — RSS URL repair and historical aliases (B13 candidate)

Implementation and demo verification do not authorize production mutation. Production
`--apply` and `--restore` are deliberately refused by this version. A later reviewed
operational integration, maintenance/fencing plan, independent security review and
explicit project/root/program-specific approval are prerequisites to production work.
No production adapter or deployment approval is implied by these instructions.

### Private alias schema and ownership

Private `{root}/importKeys/importKeys/{keyHash}` reservations retain
`targetKind: "episodes"`, `targetId`, `keyHash`, and `reservedAt`. RSS reservations
add the following fields:

| Field | Required value |
| --- | --- |
| `rssAliasVersion` | Integer `1` |
| `rssOwnerRoot` | Exact validated `HudHudDev` or `HudHudOfficial` root |
| `rssOwnerProgramId` | Exact validated episode/program identity |
| `rssOwnerStationId` | Exact validated station identity |
| `rssOwnerExternalIdHash` | SHA-256 hex of the owner's immutable stored `externalId` |

The key remains the existing `contentIdentity('episodes', {programId, audioUrl})`
hash. Raw/decoded URLs and GUIDs are absent from proof metadata and logs. No growing
array is stored. Every older alias independently retains its proof through more
than three GUID-preserving feed URL rotations and admin URL edits.

Every reservation must reference an existing, non-deleting owner with matching
root/program/station/episode identity and external-ID hash. Incoming alias keys and
legacy deterministic IDs must resolve to one owner; multiple owners, missing
owners, malformed/foreign proof, or inconsistent relationships fail closed.
A completed URL-key backfill does not index GUIDs: at most two distinct incoming
raw/decoded external IDs are also resolved through program-scoped equality queries
with a two-document bound each. Distinct GUID owners fail closed.
Historical rows without immutable `externalId` binding can retain an ordinary
current-URL reservation; ambiguous escaped aliases require reviewed repair. Admin
identity editing preserves verified historical RSS reservations. It never
reassigns an RSS alias because the current URL changed. Program/station transfers
that invalidate proof require a separately reviewed alias update, not automatic
scope relaxation. Deleted-owner aliases remain blocked pending reviewed cleanup;
this patch does not reclaim orphan aliases or change deletion semantics.

The private job path is `{root}/rssUrlRepairs/runs/{manifestHash}`. It contains only
schema version2, manifest/run identity, lease owner/generation/expiry, progress
cursors and status. Immutable apply receipts at `items/{index}` and restore
receipts at `restores/{index}` bind source create identity and expected fingerprints
to the exact Firestore commit version. Version1 manifests/jobs are rejected. Existing reservation reads retain current `isAdmin()` policy (admin claim or
station/super administrator role), while all reservation client writes stay denied.
Anonymous/ordinary/role-only moderator reads remain denied; role-only station/super
administrator reads remain allowed. New repair jobs and both receipt collections
remain denied for every client role. No Rules policy is changed by B13. The Admin SDK tool does not bypass
its own source, scope, backup or ownership checks.

### Preview, backup and review

Before later authorized execution, refresh the repository baseline and independently
review the patch, commands, current program, immutable feed identity, collision
report and complete private manifest. Preview requires explicit project/root/program.
It reads at most 100 episode records in pages of at most 50; the opaque reviewed
manifest hash and cursor allow another bounded preview. A candidate requires an
exact raw feed enclosure and matching stored external ID. Existing URLs are not
blindly decoded. Invalid or conflicting records are blockers.

The manifest contains sensitive raw/decoded URLs, GUID variants, source update
versions, complete data fingerprints and owned alias before-images. Keep it outside
the repository and `.boss`. The tool writes only an immutable AES-256-GCM encrypted
backup in an owner-only directory (0700), file (0600), using a separately managed
32-byte binary key file (0600). Backup expiry is explicit, finite and at most 30 days, with at least one hour of
remaining recovery time required at every database mutation checkpoint.
The tool fsyncs file/directory and verifies authenticated readback before any job or
source mutation. Only the private frozen capability returned by
`RssRepairBackupStore.open` is accepted. Canonical directory device/inode and file
custody are bound; expiry, permissions, integrity and custody are rechecked inside
the initial lease even for an empty manifest and every apply/restore/checkpoint
transaction. The executor never recreates a lost backup from a caller manifest. Keep the key separately, verify recoverability and expiry, and
protect the private manifest during human review. Logs contain aggregate counts and
hashes only. Do not paste private manifests or keys into review evidence.

The following syntax is documentation only; placeholders must be replaced by a
reviewed operator. No command below has been run against a real project:

```sh
node tool/repair_rss_urls.mjs --project DEMO_PROJECT --root HudHudDev --program PROGRAM_ID --backup-dir PRIVATE_DIRECTORY --key-file PRIVATE_KEY_FILE --expires-at EXPIRY_EPOCH_MILLISECONDS
```

Preview is the default; `--dry-run` is an explicit synonym. `--cursor EPISODE_ID`
continues a bounded preview. It produces an encrypted manifest and prints its hash.
It does not itself authorize apply. Review its decrypted content only through an
approved private local process; this version intentionally adds no plaintext export.

### Demo-only apply, resume and conditional restore

`--apply --manifest REVIEWED_SHA256` or `--restore --manifest REVIEWED_SHA256`
requires an owned frozen actual SDK client created by `createRssDemoFirestore`,
which fixes a `demo-` project and loopback Firestore Emulator endpoint through
public SDK settings. Claimed project/host strings or arbitrary injected transports
do not authorize writes; conflicting emulator environment overrides are refused. Both retain all
explicit scope/backup/expiry arguments. Each invocation defaults to at most 25 items
(`--max-items` can lower that bound), uses a generation-scoped lease, and resumes the
same reviewed manifest. Synthetic tests inject feed/transport callbacks and never
send notifications. Production mutation is rejected before SDK initialization.

Each item transaction rechecks program update version, immutable manifest,
source existence/create identity/update version/full fingerprint, deletion state and alias ownership
before any write. URL change, alias reservation and checkpoint advancement commit
atomically with an immutable apply or restore receipt. The receipt updateTime
equals the source commit updateTime. An interrupted acknowledgement resumes only
after verifying every committed prefix entry against its exact receipt version,
createTime and complete postimage; a cursor alone is insufficient. Identical-content
ABA writes and delete/recreate are rejected before replay/restore, without
reapplying an episode. No episode is created/deleted; no publication flag, counter,
audit, user-visible timestamp or unrelated field is changed. Existing publication
senders are not invoked by a URL-only change. Final readback verifies owned fields
and aliases; concurrent source changes fail closed.

Rollback is conditional `--restore` of the same encrypted reviewed manifest. It
restores only the URL when the complete source still matches the expected applied
postimage, original createTime and exact apply-receipt commit updateTime. A separate
restore receipt records the new commit version, and subsequent restore replay also
checks that receipt version. Raw/decoded alias reservations remain bound to the same owner for
identity safety; the tool does not delete or resurrect aliases/episodes. Concurrent
edits, deletion, lease loss, changed parent or missing/corrupted backup stop restore.
A restored run cannot apply again. Never overwrite newer content or repair conflicts
by removing reservations. Production rollback needs the same later explicit
operational approval as production apply.

### Acceptance checkpoints

- Behavioral RSS RED must fail for the intended XML/identity behavior, followed by
  GREEN focused tests, complete Functions tests and the existing Functions lint.
- Permanent review guard regressions must first reproduce the untrusted capability,
  expiry-between-items, ABA and delete/recreate failures, then pass after correction.
  Other repair guards are GREEN obligations, never missing-module/environment RED.
- Both-root Rules fixtures must preserve existing administrator reservation reads,
  deny other reservation reads and all reservation writes, and deny every client
  role get/list/create/update/delete access to new repair jobs and both receipts.
  The initial blanket reservation-read denial was an overbroad new expectation,
  corrected subject to independent contract/scope review; no existing permission
  vulnerability is claimed fixed.
- Real ABA fixtures must write a different value and then the original payload.
  An identical-data no-op with unchanged updateTime is not valid ABA evidence.
- Both-root real Firestore owned SDK commit-version/ABA/lost-ack/backup fixtures must
  execute alongside the existing RSS fixtures.
- Both-root real Firestore fixtures must execute in the integration owner's demo
  editorial emulator harness; syntax checks/unit fakes do not substitute for them.
- Independent source/security review and B15 fence integration precede acceptance.
- The 17 previously skipped emulator obligations, full Flutter suite and physical
  device acceptance remain project obligations. B13 does not satisfy or waive them.
- R09 remains OPEN until all applicable acceptance evidence is verified. No
  production migration, deployment, real notification, merge or finding closure
  is authorized by this document.

## R13 — Proposed receipt-preserving offset cutover procedure

This procedure is a future B16 implementation contract, not an executed migration
or deployment instruction. Use the data contract's exact private schemas/key and
fingerprint tuples. Production apply/restore remains unsupported and fails before
SDK initialization. No live message, data operation or activation is authorized.

### Explicit preview scope and bounds

Require one project, one known root, one valid program ID, an explicit canonical
UTC cutoff string YYYY-MM-DDTHH:mm:ss.sssZ, and inclusive from/to LOCAL dates
YYYY-MM-DD in native Firestore-supported years0001..9999. Round-trip validate
real dates; maximum range31days. No timezone guess
from the workstation. CutoverAt is the supplied operational instant, stored as a
native Timestamp; it is not an activation/commit timestamp or permission to send.
Per preview/manifest at most25 occurrences with an explicit date cursor; each
apply/restore invocation at most25 occurrence transactions, serial concurrency1.
At most2 V1 point reads and1 V2 point read per occurrence, plus program/station and
job/entry-receipt reads. No broad all-root receipt scan or unbounded date expansion.

Each private version1 manifest binds exact scope/date cursor/cutoff, normalized
schedule/fingerprint, program native create/update identity, station identity/
version, exact V1/V2/stamp before-images and versions, decisions, next cursor and
canonical SHA-256 manifest hash. Preserve typed timestamps/nanos in encrypted
before-images; never serialize raw payload/keys into public logs. Human review
must cover every chunk and exhaustion, ambiguous evidence and conservative holds.
Missing historical evidence is not an unsent proof. Preview has zero database
writes and cannot itself authorize mutation.

### Prepare, verify, apply

1. Independently verify RED-before-fix timing/race/compatibility assertions, final
   GREEN shared caller tests and both-root client denial. Register shared I file
   locks and actual required indexes before source integration. B15 prerequisites
   must be complete for B16 dispatch.
2. For any later authorized operation, stop/drain incompatible old/new notifier
   workers and their collector. Prevent relevant program/schedule/relationship
   edits during mapping or fail CAS on drift. Obtain actual platform isolation
   evidence; a caller boolean/generation/manifest is insufficient. Production
   mode stays unavailable in this implementation. Synthetic demo tests own the
   controlled clients/transaction barriers and a zero-network messaging stub.
3. Open a private frozen backup capability outside any repository/.boss, with
   separate32-byte key custody,0700 directory/0600 files, AES-256-GCM integrity,
   immutable exclusive creation, fsync/readback and exact directory/file identity.
   Require at least1hour recovery window, at most30days expiry. Apply/restore
   requires the already-persisted reviewed backup; never recreate a lost backup.
   Revalidate integrity/custody/expiry inside initial lease (including empty
   manifests), each item/checkpoint/rollback and final prefix verification.
4. Mutations use only an owned frozen public-SDK demo loopback factory and private
   binding; reject arbitrary facade/project/host or duck-typed backup assertions
   before transactions. Production endpoint/project mutations fail closed.
5. Acquire job owner/generation with120000ms lease, renewing each serial commit.
   Compare lease generation/owner/expiry, exact source versions/create identity,
   program/station fingerprint and reviewed before-images on every retry. Each
   occurrence's conservative suppression, immutable item receipt and nextIndex
   commit atomically. Read all sources before writes. Lost acknowledgement must
   verify exact applied target versions/postimages and receipts before resuming;
   do not trust nextIndex alone. Source/backup/identity drift stops without send.
   Apply the data contract's native item receipt rule: targetCreateTime and
   targetUpdateTime are literal PRE-write observations (both null only for proven
   absence), with targetChanged distinguishing genuine mutation from no-op. A
   changed target's native update version comes from the original immutable item
   receipt snapshot.updateTime; a new target's create identity comes from that same
   commit, while an existing target retains its observed create identity. A
   preserved target keeps its observed update version, never the receipt time.
   No future committedAt/native version is stored from a server timestamp transform.
   Postcommit readback verifies receipt, target projection and exact native metadata
   before item verification. Lost ACK recovers that exact proof or remains held;
   never repeat an uncertain mutation or adopt equal-value ABA/delete-recreate.
6. Write only matrix-authorized suppression or exact prepared/retryable/terminal-
   failed state carry to an absent V2; never reset inherited attempts/clocks or
   bypass live ownership, original retryAt, nonretryable outcome or expiry. Retain
   existing terminal V2 and all V1 receipts byte-for-byte. Clear decisions are
   no-ops, not success receipts. No message send, program creation/deletion,
   publication/counter edit or compatibility-stamp reset is allowed by this tool.
   Verify final evidence and record incompleteness until every reviewed chunk is
   exhausted. A completed demo job is not production cutover readiness.

### Conditional rollback and approvals

Rollback first stops/drains workers and collector again, verifies the same durable
backup, owned target create/update versions, receipt prefix and unchanged source
scope, then records rollback-held by CAS. It preserves both receipt namespaces,
all unknown/sent/ambiguous suppression and stamps. It does not delete newly created
suppression, revert terminal to retryable or resurrect a removed program. Conflicts
remain held for separate review. A genuine preserved-terminal or clear no-op has
no owned target mutation to undo; its observed version/absence remains the CAS
boundary. Never use the item's later receipt metadata as that no-op target's
version or delete a suppression created by a migration. Do not resume an old notifier solely by reverting
code; it cannot read V2 authority. Never test rollback by sending a real message.

Required demo regressions: UTC/+180/negative offsets; offset weekday/date rollover;
exact0/10-minute same-day boundaries; schedule/station edit at start transaction;
concurrent claims; sent/unknown/expired-sending and malformed legacy evidence;
overlapping Yemen days; versioned/unversioned stamps; legacy/V2 fingerprint conflict;
provider-ack stamp failure; claimed unexpired/expired safe reclaim without loss;
retryable failures before/at retryAt, original attempt/backoff/expiry carry,
nonretryable/expired no-bypass, missing-fingerprint valid V1, multiple-source
blockers and reversed date/hash ordering; retained evidence with expired cleanupAt; bounded
broadcast cleanup; backup drift/expiry/tampering, lease takeover, crash before/after
commit, ABA/delete-recreate and rollback-held resume. Prove shared episode/broadcast
sender defaults unchanged and no live network messaging. Distinguish behavioral
RED from new-tool safety GREEN and environment/setup failures. Keep original17
skipped identities, final Flutter/device acceptance, independent reviews and later
production migration/deployment/rollback approvals separate. R13 stays OPEN.


## Count native metadata receipts — proposed B15 clarification

Before first empty-root bootstrap use, independently review the data contract's
native-metadata binding clarification. REQUEST_TIME transforms are not exact
create/update metadata; preserve the two failing native-precision regressions.
Creation baselines remain immutable native birth receipts. Full reconciliation or
recovery rewrites them only as baseline-origin records with verified literal native
createTime, or retains pause until reviewed rebaseline. Never restore an old
creation body and use its restore version as birth identity.

After verified staging/inventories, commit the named paused activation-barrier
fields in the existing root completion state, then atomically release while binding
the exact observed native barrier version as activeFrom. Verify plan/lineage,
owner/epoch, complete inventory proof, backup custody/recovery window and native
readback. Keep all writers fenced and old/unowned SDK writers isolated through
the gap. Read-only replay cannot overwrite an already accepted active root.
Rollback retains accepted lineage and pause/isolation until compatible authority or
reviewed rebaseline; it never reopens unsafe legacy writers. Full nonempty
reconciliation/restore and ABA/version receipts remain later04-T09 obligations.
No live migration, root activation, deployment or production isolation support is
authorized by this amendment. Preserve the existing B16 operations appendix.


## B15 full nonempty reconciliation — accepted bounded operating contract

The full nonempty persistence section in
`docs/contracts/firebase-data-contract.md` is independently approved in
`.boss/technical-review/B15-nonempty-contract-review.md`. Source implementation and
first use remain subject to their separate quality and runtime gates. Existing early
empty bootstrap remains separate. No production mode or isolation adapter is
available. Do not run migrations or deploy under this technical contract.

Accepted implementation API in the existing `tool/reconcile_comment_counts.mjs`:
`applyCommentCountReconciliation` and `restoreCommentCountReconciliation` take
`{firestore,projectId,root,manifest,expectedManifestHash,backupStore,maxItems:25,owner}`
with the owned frozen loopback SDK facade and private count backup capability.
Existing preview remains read-only; reviewed root-wide intent is not a frozen
pre-pause inventory. Every call returns `{status,phase,processed,cursor}`; status is
`in-progress`, `active` or `restored-held`. Cursor is diagnostic opaque progress,
never a caller override. No export is available until implementation is reviewed.

Run serial bounded calls through post-pause inventory, canonical-comment and
existing-contribution union staging, complete second inventory/source verification,
paused native barrier and guarded release/readback. Each call handles at most25
units, each query at most25 records. Persist checkpoint/receipt/backup hashes;
resume first revalidates committed prefixes in bounded calls. No phase is complete
until its ordered traversal reaches EOF, including empty episodes and deleted
comment tombstones. Root lease epoch never supplies episode data generation.

Human review covers explicit project/root, before-root boundary, root-wide scope,
backup custody/recovery window and source acceptance. Encrypted per-unit preimages
are produced only after guarded pause and authenticated before mutation; they omit
canonical comment content. Never paste manifests, raw content or keys into logs.
Missing/expired/corrupt backup, changed native version/create identity, old planned
private namespace records, lost ownership, mixed generation or incomplete proof
stops progress with the root paused. An active accepted replay verifies proof
read-only; it never repeats a counter update.

Conditional restore uses the same plan/receipts and at most25 units per call;
it restores only owned counter and private ledger state after exact native
version/postimage checks. It never writes canonical comment content or status,
creates/deletes episodes/comments, overwrites newer content, or erases lineage.
Historical creation/mutation receipts require verified explicit native conversion
before rewrite. If conversion cannot be proven, remain paused for reviewed
rebaseline. Completed restore is `restored-held`, not live release. Keep isolation,
backup and durable jobs until separately reviewed compatible rebaseline/activation.

Required author and independent gates include genuine existing-producer RED before
its fence/count-preservation fix; new full-tool cases are acceptance guards rather
than missing-export RED. Verify more than100 IDs across bounded calls, both roots,
current+old-generation+deleted tombstones, empty episodes, lease/custody failures,
newer status/delete, native nanos/no-op/ABA/recreation, unknown commit/lost ACK,
changed inventory and comments, conditional recovery conversion, read-only accepted
replay, old namespace refusal and production refusal. Parent owns actual SDK/Rules/
worker rehearsal; unit models do not substitute. Preserve the17 original skipped
test identities and outstanding Flutter/device/independent/production gates.


Version-chain clarification: current target versions come from per-target heads
and their referenced immutable apply/restore receipts. Numeric receipt enumeration
excludes head-* records by document-ID range. Resume checks predecessor chains
with persisted bounded cursors; restore walks apply units backwards and records
new inverse receipts/head versions. Never compare an old apply receipt directly
to a target validly rewritten by a later owned unit or restore. Identity inventory
digests contain only ordered ID/exact-createTime pairs; source updateTime is a
separate CAS advanced solely through proven owned counter receipts. Native recovery
normalization has explicit verified image hashes and retains original receipt
proof. This avoids both false source drift on honest finalization and stale
metadata overwrite on multi-step restore. All records remain private and under
the existing units collection; no public API/dependency changes are introduced.


## Full04-T09 replay/read accounting clarification — accepted technical clarification

Read-only accepted replay verifies the original immutable result, not today's
published-comment count. Legitimate later worker mutations do not invalidate that
historical proof, but may block conditional restore's fresh current-target CAS.
The accepted root/plan/native release identity and complete contiguous receipt,
episode-proof and historical-head aggregates remain mandatory. Firestore stays
read-only; a purpose-bound durable AEAD replay head inside the existing private
backup capability resumes proof in bounded calls. It uses an exclusive owned lock,
authenticated predecessor/revision CAS, atomic fsynced publication and readback;
caller cursors/old files cannot advance it. Ambiguous locks/publications stop or
restart from zero, never bypass verification. No automatic expiry cleanup occurs.

maxItems 1..25 counts logical enumerated rows/heads/receipts/ancestry/empty transitions.
Fixed at-most16-read item CAS does not charge another logical unit, but every
actual SDK retry/read counts physically. Transactions explicitly cap attempts at 3;
out-of-unit transactions/reads are separately bounded. Absolute 1536 application-issued read
equivalents per invocation includes attempts, empty reads, queries, admission and
final checks;75 enumeration+1200 CAS+192 control+32 other reads leaves37 reserve.
Internal gRPC retries/provider billing/index-entry charges are not observable or
claimed by this wrapper. Reserve worst-case query cost before issuing reads; cap exhaustion
cannot be reported as complete. Preserve full source isolation/backup/native/restore
requirements. Existing demo API is the operating surface; direct CLI mutation is
refused. This clarification is not a production operation or implementation gate.


## Consolidated full04-T09 checkpoint coverage — accepted technical contract

The data contract's consolidated audit enumerates every additional private plan/
episode/receipt/purpose-backup checkpoint, initialization and recovery rule. Independent approval is recorded in
`.boss/technical-review/B15-checkpoint-audit-review.md`; source/runtime gates
remain separate. No normal count wire,
namespace, product flow or dependency changes. maxItems 1 must make finite persisted
progress; recovery prefix and restore prefix are frozen before their own receipts
append. Preserve original stage digests and already emitted episode proofs.

Native receipt digests lag by exactly one pending latest receipt. Each next guarded
commit folds its observed native predecessor. Final release folds only the paused
barrier, then creates the adjacent release receipt; proofMaxUnit+1==releaseUnit,
with no numeric gap or unbounded final scan. Admission/CAS and attempted reads
remain under accepted application-visible caps, not provider billing guarantees.


## Full04-T09 demo implementation handoff — verification pending

The implementation candidate exposes `applyCommentCountReconciliation` and
`restoreCommentCountReconciliation` from `tool/reconcile_comment_counts.mjs`.
They accept the existing owned `firestore`, `projectId`, explicit `root`, reviewed
`manifest`, `expectedManifestHash`, private `backupStore`, stable `owner` and
`maxItems` (1..25). Preserve the same owner and authenticated manifest across
bounded calls. Results contain `status` (`in-progress`, `active` or
`restored-held`), `phase`, `processed`, informational `cursor`,
`readEquivalents` and `transactionAttempts`. New full APIs reject caller `now` overrides; lease decisions use runtime time.
Only the private QA actor may scope its finite test clock within its own process.
Cursors are output only: persisted,
authenticated state determines continuation. A first successful release returns
`active` after native readback and durable release pinning; a subsequent accepted
replay must exhaust its historical proof before returning `active` again.

Use only `createCommentCountDemoFirestore` with an explicit demo project and
loopback emulator host. Open `CommentCountBackupStore` in a private 0700 durable
directory using a privately retained 32-byte key and a reviewed expiry, then
persist/read back the preview manifest using `writeVerified`. The existing early
empty-root bootstrap API remains available. No direct CLI mutation, production
apply, production restore or production activation is supported. Do not interpret
a project name, environment variable, caller assertion or emulator host alone as
production isolation evidence. The factory checks actual SDK settings and owns
the frozen transport capability.

Apply freezes the root, inventories episode ID/exact native createTime twice and
stages the complete union of current comments and existing contribution rows,
including old generations and deleted-comment tombstones. Original source
versions remain separate CAS values and may advance only through verified owned
heads/receipts. Every bounded mutation rechecks lease/root/plan/native identity,
private custody, expiry and the purpose-bound encrypted unit backup. Immutable
numeric receipts and disjoint mutable target heads preserve changed/no-op native
identity, logical apply ancestry and physical restore ancestry. Unknown commits,
ABA, recreated parents, changed canonical content or unverifiable native receipt
conversion stop with the root paused. No counter clamp or guessed legacy baseline
is used.

Restore performs fresh current-target and canonical-source verification before
its first inverse and uses immutable restore receipts for later inverse commits.
Only owned counter fields and private baseline/contribution state are restored;
canonical comments, statuses, authors, publications and parent documents are not
restored, created or deleted. Native creation/mutation identities are materialized
into reviewed literal forms before a rewrite. A successful rollback ends
`restored-held` with the root paused. It is not permission to release legacy
workers or automatically reactivate; reviewed compatible rebaseline/isolation
remains necessary. Source drift or unsupported conversion requires held recovery,
not a partial overwrite.

Accepted replay reads immutable historical receipts and the activation-bound
proofs, never treats today's mutable counters or comments as a fresh recount, and
issues no Firestore writes. Its local purpose-bound AEAD head is pinned to the
exact accepted native release identity. Resume uses the durable published head,
not a caller-selected old file. Publication verifies owned lock inode/token,
authenticated predecessor/revision, fsync, atomic rename and readback. Unknown or
abandoned locks fail closed; no PID/age lock stealing or automatic evidence
cleanup occurs. Custody loss/expiry requires reviewed local recovery or a safe
proof restart, never skipping proof. Retain keys/backups and failure evidence for
the entire approved recovery window.

The application-visible limits are at most 25 logical visited work units and
1536 issued document/query read equivalents per invocation, with at most three
visible transaction callback attempts and fixed CAS/control admission reserves.
Reported attempts include retry callbacks; empty queries cost a read equivalent.
They do not measure SDK-internal gRPC retries, provider billing, index-entry costs
or wall-clock completion. Budget exhaustion must not be reported as completion.

The registered test file also provides two QA-only private IPC actors:
`--count-sdk-maintenance-child` performs exactly one accepted apply/restore call;
`--count-sdk-replay-child` requires an actual active full result and performs one
read-only accepted replay call. Both require a strict demo/loopback request,
authenticated existing backup custody and private in-memory key transfer; direct
invocation or malformed scope is refused. Generated key material must never be
passed in argv/environment/logs. The optional finite `nowMs` is only a test actor
clock seam, not a production API or approval bypass. The response kind is
`count-sdk-result`, with a minimal result/metrics or sanitized refusal. Actual SDK
rehearsal must use the real owned factory/store rather than replacing their
private capabilities.

Unit guard results are candidate evidence only. Independent source/security
review and parent-owned real SDK scenarios N01–N14 (including more than 100 rows,
maxItems 1 recovery, native nanos/no-op/ABA, post-commit ACK loss, multi-process
read-only replay, custody/lock failures and mid-flight pause ordering) remain
required before this checkpoint is accepted. Existing historical business RED
and all prior failure logs remain preserved. The 17 original skipped emulator
test identities, complete Flutter tests, physical-device acceptance and separate
production approval remain obligations; no finding is closed by this handoff.


## B16 T11 pending native receipt seal — proposed independent review

Before any later authorized demo execution, use the data contract's exact bounded
receipt seal. A pending original item receipt and the job's native updateTime must
still prove the SAME occurrence commit before a lease/owner/epoch/status checkpoint
can overwrite that anchor. Verify exact source/target/body, every already-sealed
literal receipt identity and the authenticated durable backup inside the seal
transaction. Append only that proven native Timestamp to receiptVersions (max25),
clear pendingReceiptIndex and read back. No transforms, caller clocks, current
replacement receipt versions, implicit empty arrays or operator isolation flags
may supply historical identity.

Normal live ownership rules remain. A foreign live owner cannot seal. Expired
pending ownership can be acquired only atomically WITH a successful proof-preserving
seal and generation increment; it cannot renew first and inspect the receipt later.
The final item is applying+pending until seal; completed requires the full sealed
prefix/null pending. Empty jobs are []/null. A failed/unknown seal ACK resumes from
the exact pending anchor or the already-published literal prefix, never repeating
an uncertain occurrence. Cold resume and non-erasing rollback verify all literals;
rollback resolves pending first, then records rollback-held without any target,
source or stamp write. Missing/corrupt/recreated proof stays held with evidence.

Each invocation may perform at most maxItems (1..25) new occurrence commits and
one required seal per such commit, plus resolution of at most one earlier pending
commit and bounded acquire/readback/final proof. Each prefix scan is at most the
manifest's25 entries with at most2 V1 and1 V2 point reads per entry plus job/item/
program/station reads; no broad receipt scan/new index or dependency is introduced.
Application transaction callbacks use maxAttempts3. SDK transport retries and
provider billing remain outside this stated application bound.

The permanent synthetic no-op receipt recreation failure is retained separately
from the historical R13 behavioral RED and setup/new-tool GREEN. Rehearse native
last-item pending, partial progress, live/expired owner, pre/post-seal ACK loss,
receipt ABA/recreate and genuine no-op version preservation through the actual
owned demo SDK before acceptance. No real migration or provider send is authorized.
Production mutation/isolation remains unsupported; retain both namespaces, every
suppression and backup evidence. All count appendices, original17 identities,
Flutter/device gates, independent reviews and production approvals remain intact.


## T11 demo migration candidate handoff — independent source/native review pending

`tool/migrate_program_notification_dates.mjs` is import-safe. Its default mode is
read-only preview. Explicit project/root/program, canonical inclusive local dates
(max31days), canonical UTC cutoverAt, optional local-date cursor and maxItems1..25
select a reviewed chunk; they do not override security runtime clocks. A preview
contains at most25 occurrences, deterministic ordered legacy date/key pairs,
typed source/target observations, exact native identities and closed decisions.
An unresolved blocker prevents all apply writes. nextCursor must be reviewed until
null; finishing one chunk is not completing an unreviewed remaining range.

Actual candidate interfaces:

- `previewProgramNotificationDates(options, firestore)` and
  `validateProgramDateManifest(manifest, options)` are read-only.
- `createProgramDateDemoFirestore({projectId, emulatorHost})` constructs the real
  frozen SDK facade, bound privately to an explicit demo project and loopback
  host. Arbitrary SDK/store facades and production mutation flags are refused.
- `ProgramDateBackupStore.open({directory,key,expiresAt})` provides private,
  purpose-validated AES-256-GCM custody. put/get use immutable exclusive files,
  authenticated readback, directory/file identity,0700/0600 ownership and the
  existing1hour recovery/30day ceiling. Keep the32-byte key separately; CLI key
  files must be private, outside repositories/.boss and outside the backup folder.
- `executeProgramNotificationDateMigration(options, firestore,
  {manifest,store,reviewedHash,owner})` accepts mode apply or restore, using only
  the existing private notificationOperations job/item paths. No public clock,
  isolation boolean, caller projection or ignored-field list exists.

CLI scope flags are `--project`, `--root`, `--program`, `--from`, `--to`,
`--cutover-at`, optional `--cursor`/`--max-items`, and explicit private
`--backup-dir`, `--key-file`, `--expires-at`. Preview/`--dry-run` persists only
its encrypted reviewed artifact and emits counts/hash/cursor. Later authorized
apply/restore additionally requires `--manifest` and stable `--owner`. No
production apply/restore/activation is supported: refusal precedes SDK creation
and key/backup filesystem access. Importing the module executes no CLI, SDK
initialization, credential lookup or migration. No real migration command was
executed for this candidate.

Apply preserves V1/program/station/stamp documents and writes only the authorized
V2 target when necessary, immutable same-transaction item receipt and bounded
job progress. Genuine no-ops retain literal observed target versions/absence.
Mandatory native pending seals use the independently approved T11 contract
(`.boss/technical-review/B16-T11-contract-review.md`); original receiptVersions
remain immutable across lease renewal/resume/held rollback. Every NEW occurrence
transaction verifies the entire bounded sealed prefix itself before writes;
an earlier separate readback is insufficient. Security clocks are internal
Date.now; source/type/identity/custody drift stops before the next mutation.

The result reports applied NEW occurrences, status, nextIndex, chunkCompleted,
completed and nextCursor. completed is true only for an applied fully sealed
chunk with null nextCursor. Restore conditionally verifies the complete committed
prefix and records rollback-held; it does not erase/revert any V2 target, create
an absent target, reset stamps, resurrect sources or authorize old workers.
Held status alone does not drain workers; later operations must independently
keep incompatible notifier/collector workers isolated.

Validation uses Node22: `node --test tool/test/migrate_program_notification_dates.test.mjs`,
then the existing Functions `npm test` and `npm run lint`. Model/CLI refusal
checks are candidate evidence, not actual Firestore commit, client permission or
production index evidence. Parent-owned04-T12 must rehearse native pending/seal,
ACK loss/expiry, prefix drift, carry clocks, both-root client denials and the
unchanged broadcast-prefix collector query. Its20-result limit is not a promise
of20 reads or billing units; emulator success cannot prove production index
availability/read cost. All original17 identities, full Flutter/device acceptance,
independent reviews and later production approvals remain separate. R13 is OPEN.
