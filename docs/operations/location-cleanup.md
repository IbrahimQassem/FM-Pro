# Reviewed location cleanup and recovery

Use Node 22. This tool is an administrative maintenance operation, never app
startup. Run against a demo emulator first. Live apply/restore requires the
authorized environment's maintenance approval and a retained reviewed report.

Preview with an explicit project and one root (replace the demo project only
when authorized):

```sh
node tool/remove_old_locations.mjs --project demo-hudhud-location-cleanup --root HudHudDev --report /tmp/location-review.json
```

Default mode is read-only. The report separates referenced records from deletion
candidates and retains typed candidate snapshots. Review those candidates and
the target project/root. The tool refuses to overwrite an existing report;
choose a new path for each preview.

After review, apply a bounded group:

```sh
node tool/remove_old_locations.mjs --project demo-hudhud-location-cleanup --root HudHudDev --apply --report /tmp/location-review.json --backup /tmp/location-backup.json --max-items 25
```

Apply writes and syncs a private backup file and its directory entry before any
deletion. Use durable storage rather than `/tmp` for an authorized live backup.
Existing backup contents must exactly match the report. Each transaction checks
the reviewed snapshot and station references again, then deletes one record and
records its checkpoint atomically. Errors retain previously completed checkpoints.
Re-run the same command after resolving the cause to resume; already completed
items are skipped. Changed/referenced candidates require a new reviewed preview.

Restore a completed or partial run with the same report and backup:

```sh
node tool/remove_old_locations.mjs --project demo-hudhud-location-cleanup --root HudHudDev --restore --report /tmp/location-review.json --backup /tmp/location-backup.json --max-items 25
```

Restore never overwrites an existing record. It restores only deleted records
with matching checkpoints, preserving typed values, and is itself resumable.
Untouched candidates from a partial apply are skipped. A restored run cannot be
reapplied; start with a fresh preview if another cleanup is needed. Retain the
report, backup and checkpoint identity with the maintenance record. Do not place
live snapshots or records containing personal data in Git.

Local acceptance: `npm run emulators:location-cleanup` covers both roots,
backup failure, partial-run restore, bounded resume, typed timestamps, concurrent
reference changes and stale reviewed snapshots using synthetic records only.
