# Station privacy and listener-email migration — C01

Status: implementation contract; tools, rehearsal and production apply are not
completed by this document. Applies to WO-01/R01 and R10. Preserve the existing
architecture and use no new dependencies by default. See the
[data](../contracts/firebase-data-contract.md#station-privacy-amendment--c01-2026-10-25)
and [security](../contracts/security-privacy-contract.md) contracts.

## Writer and consumer inventory

Recheck this inventory at the exact implementation candidate commit. Any newly
discovered writer or full-document restore blocks cleanup until owned and tested.
Paths below exist today; the dedicated privacy migration tool is still proposed.

| Paths | Required boundary |
|---|---|
| `functions/lib/editorial-audit.js`, `admin-content.js` | Validate and atomically partition mixed saves; public/private preconditions; scrub legacy keys before no-op return |
| `functions/lib/admin-content-delete.js` | Delete eligible station and private metadata atomically; preserve existing relation/deletion barriers |
| `functions/lib/admin-content-relations.js` | Preserve narrow geography/counter updates; never copy full legacy station data |
| `web_admin/lib/save-content.ts`, `batch-import.ts`, `delete-episode.ts` | Existing callable path; explicit private precondition for private changes and station deletion; fail safely on stale snapshots |
| `web_admin/lib/content-form.ts`, `export-excel.ts`, `components/admin/admin-app.tsx` | Authorized bounded private reads; no legacy public fallback; no blank overwrite after failed read |
| `tool/firebase_seed/seed.mjs`, `seed_contract.mjs` | Allowlist public fields; reject private input unless separately authorized through the private protocol |
| `tool/import_programs_and_episodes.mjs` | Missing-station creation uses public projection only |
| `functions/scripts/sync_sheet_updates.mjs` | Direct station create/update stays public-only and field-specific |
| `tool/migrate_station_locations.mjs`, `migrate_regional_location.mjs` | Geography writes/restores must never reinsert private fields; retain the existing five-field regional restore projection rather than rewriting it |
| `tool/remove_old_locations.mjs` | Station-reference reader/location writer; no private station snapshots in reports |
| `tool/seed-admin-preview.mjs` | Public synthetic fixtures; separate private synthetic fixtures |
| `functions/lib/stream-health.js` | Health-only writes preserve private revision and public playback fields |
| `functions/lib/rss-ingestion.js` | Station reader/episode and relation writer; no private metadata copying |
| `functions/index.js`, `functions/lib/station-subscriptions.js`, `functions/lib/user-management.js` | All listener bootstrap, subscription repair, password and legacy profile writes omit email; retain deletion barriers |
| `tool/migrate-legacy-users.mjs` | Remove email creation/backfill and raw UID/name/email logging; quiesce this standalone tool until its regression gate passes |
| `web_admin/components/admin/admin-app.tsx`, `web_admin/components/admin/user-actions-modal.tsx`, `web_admin/lib/resource-filters.ts` | Remove profile-email display/search/name fallback; retain own-admin authentication behavior |
| Flutter/public repositories and mappers | Public readers remain compatible; current-user email comes from Auth; no private-document read added |

## Deployment and execution order

1. Approve contracts and independently review the exact candidate; implement all
   writers, consumers, Rules and tests. Existing unsafe maintenance tools must be
   quiesced until upgraded; inventory includes restore modes, not only forward writes.
2. Verify synthetic/demo tests in both roots: role matrix, atomic save/delete,
   revision conflicts, legacy omission, malformed payloads, producer reinsertion,
   crash/resume and conditional restore. Existing denial guards may already pass;
   never weaken Rules to manufacture RED. Separate reviewer and QA approval follow
   integrated GREEN evidence at the candidate commit.
3. Separately authorize deployment and production work if needed. Deploy the
   compatible server and private-path Rules before enabling the new admin reader;
   update consumers and disable unsafe producers before cleanup. Public old clients
   retain playback; old private edits may require reload/upgrade rather than loss.
4. Operate on one explicit project and one explicit known root per run, without a
   production default. Dry-run is default and never mutates Firestore. Repeat the
   entire process independently for the other root; neither is assumed clean.

## Manifest, backups and bounded apply

- Produce a deterministic reviewed manifest identifying candidate/tool version,
  explicit project/root, document IDs, operation types, field-name changes, source
  update-time/preimage fingerprints, expected private revisions and backup IDs.
  Include private/public collision and malformed-record conflicts. Counts alone do
  not approve a different manifest. Keep manifests with identifiers/fingerprints
  inside the same private access boundary; publish only aggregate evidence.
- Before the first mutation, persist encrypted immutable preimages for every
  manifest target in an operator-supplied protected durable location independent of the process; verify
  read-back integrity, access controls and expiration. Include both station
  projections or the exact profile-email cleanup preimage as applicable. Do not
  place backups in Git, `.boss/`, stdout, general logs or public artifact storage.
  Backup success is a hard precondition, not an in-memory promise or local temp file.
- Production backup location and retention require the operator approval checkpoint
  before production apply; no cloud destination is invented or provisioned here.
  Proposed retention for that decision: expire backups seven days after verified
  apply/recovery acceptance, with a maximum of 30 days after creation. Safe tools
  can be built now but must refuse production apply without an explicit approved
  retention/expiry configuration. Synthetic tests may use temporary backup stores.
  Record the approved expiry at creation;
  monitor deletion and retain only non-PII aggregate deletion evidence. A longer
  incident hold requires a separate explicit privacy decision before expiry, never
  an automatic extension or indefinite retention. Manifest/checkpoint records
  containing identifiers follow the same retention; do not start an apply whose
  backup expires before the planned recovery window.
- Limits: at most 100 target records per invocation, read pages at most 50,
  batches at most 25 transactions, transaction concurrency 1. Checkpoint after
  committed work; do not checkpoint uncommitted promises. Resume validates the
  same root, project, manifest and tool/schema version.
- For each station transaction, read both projections and verify manifest
  preconditions before writes. Move validated private data to the exact private
  path and delete all 13 public keys atomically. Preserve ID, public fields,
  relationships, counters and audit contracts. Identical duplicate fields may
  consolidate; conflicting canonical/legacy values stop for reviewed resolution.
  Never resurrect a deleted station or overwrite a concurrent editor.
- Email cleanup removes only `email` from the identified listener profile when
  its preimage still matches. Preserve all other fields, Auth and OTP challenge.
  Never recreate a missing/deleting profile. Producer fixes precede cleanup.
- Crash after commit/before checkpoint must resume idempotently by recognizing
  the expected postimage and recording completion; any other drift is a conflict.
  Do not accept a changed record merely because it lacks one private key.
- Stop on missing/unreadable backup, unknown root/schema/writer, stale manifest,
  authorization failure, private conflict or violated bound. Record safe counts
  and conflict classes only, without raw values or identifying log payloads.

## Verification and privacy-safe recovery

Read back each committed target against its expected postimage and complete a
bounded full scan for remaining public private keys/profile emails in that root.
Verify private preservation and no writer reinsertion in rehearsal. Review the
remaining conflicts; no unresolved target can be reported migrated. Review logs
must not contain the source values. A final clean snapshot alone does not prove
all producers are fixed or revoke past client copies.

Recovery first pauses unsafe writers or the affected worker. It does not redeploy
an unsafe pre-fix writer or permissive Rules. Restore only an explicitly reviewed
subset of safe fields to the correct private destination, with backup integrity,
current-postimage/revision checks and a fresh revision on private mutation. Apply
the same bounded transaction/resume protocol and dry-run reviewed restore manifest.
Concurrent edits, deletion or changed identity block restoration; never restore a
whole public snapshot containing any of the 13 fields, never automatically restore
profile email, and never restore a deleted user/station or alter Auth credentials.
Backup possession is not authorization to reverse the privacy decision. Email
cleanup rollback repairs unrelated safe fields only; restoring email would require
a separate approved policy change, outside this work order.

Rehearse crash-before-write, crash-after-commit, resume collisions, concurrent edits,
missing/deleted documents, conflicting private copies, backup failure and safe
restore for both roots with synthetic data before any authorized production apply.
No migration, deployment, production inspection or new test result is asserted by
this contract amendment. R01 and R10 remain OPEN pending implementation evidence.


## B06 implementation and demo-only execution boundary

The prepared module is `tool/migrate_station_privacy.mjs`; importing it does not
initialize Firebase or execute a command. The current CLI refuses production
apply/restore/verify before loading the SDK. No production approval adapter is
invented. G-O1-READY/O-1 must review any later production executor, actual backup
storage, key custody, retention/deletion mechanism and root-specific manifest.
The module is not production-accepted merely because demo tests pass.

Preview requires explicit `--project=...`, `--root=HudHudDev|HudHudOfficial` and
`--operation=station-private|profile-email`. It scans at most100 source records per
invocation using pages at most50; records without migration targets still consume
that budget. `--cursor=<last-id>` is explicit continuation. Preview prints only
aggregate counts/status; identifiers, cursors, private values and exact before/
after images remain inside an encrypted private manifest. A conflicting manifest
may be persisted for private review but cannot be applied.

Provide an existing owner-only directory outside every Git checkout and `.boss`,
a32-byte key held separately from that directory and outside this repository,
and an explicit expiry (`--backup-dir`, `--key-file`, `--expires-at=<epoch-ms>`).
Key files must be owner-only regular files, never symlinks. Backups are immutable
AES-256-GCM authenticated envelopes written with exclusive create, file and
parent-directory fsync, readback, manifest-hash verification and permission checks.
Neither keys nor backup values are printed. Retention may not exceed30 days;
at least one hour of recovery coverage must remain before execution. Production
storage/retention approval and verified expiry deletion remain separate required
operational work. Synthetic tests use temporary private directories and remove
them during fixture cleanup.

The private operational path is
`{root}/privacyMigrationJobs/jobs/{manifestHash}` with per-item receipts beneath
`items/{zero-padded-index}`. No SDK client role may read or mutate jobs/receipts.
Jobs bind schema/tool/project-root-operation identity, lease owner/generation,
expiry and next index; receipts contain hashes/state only. The reviewed private
manifest carries the target IDs. These metadata writes are additional to target
writes and must not be represented as zero total writes.

Apply additionally requires both a `demo-` project and a loopback emulator host,
`--apply`, the encrypted reviewed manifest (`--manifest-hash`) and successful
backup verification before any Firestore mutation. All target/private/source/job
reads precede transaction writes. Each batch performs at most25 target
transactions, serially; one separate bounded control transaction acquires the
job lease. Data, receipt and checkpoint commit atomically, eliminating a
non-atomic commit/checkpoint gap. After commit-before-acknowledgement, resume
verifies receipt and exact source/private update-time seconds+nanos. An active
lease blocks another executor, even if it reuses the owner string. Lease theft,
source edits, deleted source records, changed private copies or a new account-
deletion job conflict rather than overwrite or resurrect.

`--verify` checks receipt-bound exact postimages, including document versions.
`--restore` is deliberately privacy-preserving: this migration changes no safe
public field, so their safe before/after projections are identical. It verifies
the exact committed postimages and performs zero data writes. Moved metadata
remains private and profile email remains absent. It never restores a whole
public snapshot, deletes the canonical private copy, recreates a deleted record,
or overwrites subsequent edits. Drift blocks restore and requires a separately
reviewed recovery action. This is not an unrestricted undo facility.

The API exports `previewPrivacy`, `applyPrivacy`, `verifyPrivacy`, `restorePrivacy`
and the private `PrivatePrivacyBackupStore` factory. This store validates this
specific privacy manifest; other migration tools must not manufacture a fake
privacy manifest to reuse it. Existing SDK timestamps/bytes/references/geopoints
are encoded in private fingerprints; opaque unsupported types fail closed.
Public operational/counter fields are preserved by field-specific deletions,
not lossy full-document rewrites. R01/R10 remain OPEN pending full acceptance
and later authorized live cleanup.


B06 review correction: mutation APIs require a client returned by `createPrivacyDemoFirestore`, which constructs and freezes the explicit local demo transport. Caller-supplied project/host strings cannot authorize an unknown injected client. Backup directory ownership, mode, real path and device/inode identity are revalidated for every operation, including transaction/checkpoint boundaries. Recovery-window expiry is checked inside initial lease acquisition before any job write, including empty manifests. These corrections require fresh guard/emulator/review evidence; prior passes are not reused as proof for this revised source. Production mutation remains refused.
