# Reviewed content identity backfill

This maintenance tool prepares legacy program/episode natural identities for the
trusted editor/import/RSS transaction. It never changes or deletes content.
Implementation is local; no live preview, apply or restoration has been executed.

Use supported Node22. Choose an explicit project, root, kind (`programs` or
`episodes`) and parent ID (station or program respectively). There is no implicit
project/environment fallback. Preview defaults to at most5000 records, configurable
up to10000, read in pages of100. Invalid identities, canonical duplicates and an
occupied key belonging to another record block the entire manifest. Resolve those
through the reviewed content workflow, then create a fresh preview; do not edit a
manifest to choose an arbitrary winner.

Synthetic example only:

```bash
node tool/backfill_content_identities.mjs --project demo-hudhud-editorial --root HudHudDev --kind episodes --parent synthetic-program --report /tmp/identity-preview.json
```

Read the manifest and verify the target/count/blockers. It contains IDs, hashes,
parent update-time and prior reservation existence, without raw titles/audio URLs.
`runId` binds all fields. A reviewed mutation additionally requires separate
`--backup /path/to/immutable-backup.json` and exactly one mode (`--apply` or
`--restore`). Neither mode is a default. Keep manifest/backup outside source
control and retain them until recovery acceptance. No production action is
implied by these instructions.

Apply writes/fsyncs a create-only backup before database mutations. Each native
transaction validates the precise parent update-time, record identity and existing
reservation, then creates a missing key and its private checkpoint atomically.
Existing own keys remain untouched. A changed parent or content stops the run;
already created keys remain correct reservations. Restore the stopped partial
run before applying a new reviewed preview; its scope lock prevents overlapping
maintenance runs. Retry the same report to resume a bounded run. Durable cursors bound each
invocation to at most `max-items` item transactions without rereading completed
items. Apply and restore phases cannot run simultaneously.

Only after every item is checkpointed and an aggregate count verifies full scope
membership may the transaction create a private completed-scope marker. This is
what enables *new* identities in scopes above450; per-record reservations alone
only allow edits of already-reserved records. Current server writers must all use
the shared reservation protocol before applying this tool. In particular deploy
the compatible RSS writer and quiesce older workers/seeding/direct Admin SDK tools.
The marker does not authorize unsupported writers to bypass the protocol.

Restore removes its own completion marker first and removes only keys still owned
by that run. A subsequent trusted writer replaces the run ownership, so that key
is preserved. A marker owned by another run blocks restoration. Restoration never
rewrites/deletes content or decrements counters. Repeated bounded restoration
resumes using checkpoints; it does not reopen a restored manifest for apply.

Private data paths (denied to all Firestore clients, including admin web clients):

- `{root}/identityScopes/scopes/{sha256([kind,parentId])}`
- `{root}/identityScopeLocks/locks/{sha256([kind,parentId])}` (released on completion)
- `{root}/identityBackfills/runs/{runId}` and its `items/{keyHash}` checkpoints

Import reservations retain `{root}/importKeys/importKeys/{keyHash}`. Keys created
by this tool include `backfillRunId`; normal trusted writers replace that ownership.
Keep the artifact/backup and status evidence until acceptance; never infer a
completed migration from a successful preview or unit test.
