# Regional catalog classification and migration

`global-ar` stays the stable location/city identifier. Its reviewed local schema
is `locationType: regional`, `countryCode: ARAB`, `countryNameAr: العالم العربي`.
ARAB is an internal regional catalog identifier, never an ISO country or a
Yemeni governorate. YE/global-ar remains discoverable during staged rollout.
Other country scopes are not enabled by this change. Client location selection
and the trusted server must both accept the new schema before applying it.

The existing22-entry Yemeni coverage list is **not geographically approved**:
Mukalla/Seiyun are city coverage areas; Hadramawt and Amanat Al Asimah need
separate editorial decisions. No IDs are renamed or stations reassigned on that
basis. Preserve that work as an owner gate rather than claiming count22 proves
accuracy. Proposed review: retain both city IDs as city coverage, add the missing
administrative references, and explicitly disambiguate `sanaa` before any mapping.

Use `tool/migrate_regional_location.mjs` for the regional scope. The older seed
and station migration tools refuse direct updates to this new regional schema.
Do not use them to bypass projection/audit safety.

```sh
node tool/migrate_regional_location.mjs --project demo-hudhud-editorial --root HudHudDev --report /tmp/regional-preview.json
# After reviewing the exact project/root, station count and field differences:
node tool/migrate_regional_location.mjs --project demo-hudhud-editorial --root HudHudDev --apply --report /tmp/regional-preview.json --backup /tmp/regional-backup.json
node tool/migrate_regional_location.mjs --project demo-hudhud-editorial --root HudHudDev --restore --report /tmp/regional-preview.json --backup /tmp/regional-backup.json
```

These examples name a demo project; no production execution is implied. Live
mutation still follows the existing release authorization. The default is
read-only. Project/root are explicit and checked against the client. The manifest
binds source versions, five location fields, exact membership and target schema;
report files are exclusive/private. Backups are verified/fsynced before writes.
No media URLs, account data or whole station documents enter these files/logs.

A maximum450-station scope is committed atomically with the location, catalog
revision, private checkpoint and operational audit. Larger/ambiguous/changed
scopes stop for review. Concurrent/repeated apply commits at most one change;
restore requires this run's checkpoint/backup and matching migrated projections
and membership. It preserves unrelated editorial edits and advances revisions.
A later changed assignment/new station blocks restore; it never silently moves
new content. Reapplying an already restored run is rejected; preview a new run.

Before rollout, inspect native tests, the source/current catalog preview and
client compatibility. Owner catalog validation and real project preview are
separate gates; emulator results do not satisfy them.
