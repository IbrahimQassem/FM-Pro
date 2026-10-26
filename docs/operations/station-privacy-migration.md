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
