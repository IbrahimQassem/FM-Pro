# November roadmap execution record

User authorized implementation on 2026-10-24. Baseline: `5eac31c`.
The local `hudhud_fm` branch was fast-forwarded from `5a22422` to `5eac31c`;
existing documentation changes were preserved. No remote branch was changed.
Supported isolated runtime: Node 22.23.4 under `/tmp/hudhud-nov-node22`.
Flutter: 3.47.5 / Dart 3.13.4 on macOS.

## Scope and status

| Card | Status | Evidence / next action |
|---|---|---|
| NOV-01 | Local baseline established | Branch fast-forwarded; Node 22.23.4, Flutter 3.47.5 / Dart 3.13.4; initial Flutter suite 276 pass; initial analyzer reproduced ticker deprecation, now cleared. Remote push not performed. |
| NOV-02 | Boundary and real callable acceptance verified | Current/destination ownership, eligible roles, parent existence, deletion markers, allowed fields and server attribution checked. Real Auth/Functions tests reject guest/cross-station callers and accept own-station edits in both roots. |
| NOV-03 | Source/emulator acceptance verified | Explicit target, read-only default, typed fsynced backup, stale/reference guards, atomic per-record checkpoints, bounded resume and create-only restore. 5 unit and 6 both-root emulator tests pass. No live operation. |
| NOV-04 | Source/unit acceptance verified | Shared pinned-DNS HTTP(S) transport; manual redirects; body/decompression/deadline/concurrency bounds. 11 focused public-fetch tests plus existing stream/RSS tests pass. Raw network errors sanitized. No live source probes. |
| NOV-05 | Save/import implementation verified; enforcement/deletion still in progress | Editor/import use real callable; counters, projections, identity and audit are atomic; retries are no-ops. Finish audited deletion and direct-write Rules closure before declaring this card complete. |
| NOV-06 | Pending | Durable notification operation states and concurrency/retry tests. |
| NOV-07 | Pending | Regional classification and location/import acceptance. |
| NOV-08 | Source checks pass; browser acceptance pending | Homepage cards now use freshness-aware health resolver like details; ticker API updated, analyzer clean, now-playing widget tests pass. Final cross-client/browser acceptance remains in NOV-11. |
| NOV-09 | Pending | Flutter/web working-stream filter. |
| NOV-10 | Pending | Episode progress/duration/seeking through existing player. |
| NOV-11 | Pending | Integrated checks, browser/device evidence and release decision record. |

## Execution decisions

- Ruling: execute the recommended roadmap inline in this checkout, on
  `hudhud_fm`, preserving the prior documentation work — user requested execution
  and no subagent tool is exposed. Perform separate boundary and bypass review
  passes around the security fixes.
- Ruling: implement both bounded listener features; capacity-based deferral in
  the proposal is not a reason to silently omit user-authorized scope.
- Production deployment, live cleanup/migration and store rollout remain outside
  the code-implementation request. Prepare their evidence and recovery steps;
  do not report external acceptance as passed without execution.

## Verification ledger

### First implementation tranche — 2026-10-24

- RED: `node --test functions/test/editorial-audit.test.js` initially failed 18
  negative cases while own-station controls passed; GREEN: all 26 cases pass.
- GREEN: `npm run emulators:editorial` passed 4 tests using the actual Admin SDK
  transaction in both demo roots; rejected takeover/missing-parent attempts leave
  content and audit untouched. The full HTTP callable transport/client integration
  is still part of NOV-05, not claimed here.
- RED: cleanup tests failed before import of the original automatically executing
  script. GREEN: `node --test tool/test/remove_old_locations.test.mjs` passes 5
  cases. Initial emulator timestamp assertion used sub-microsecond precision that
  Firestore does not persist; fixture corrected to stored microsecond precision.
- GREEN: `npm run emulators:location-cleanup` passes 6 tests: wrong-client project
  is guarded; checkpoint reads/writes are denied to guest/listener/admin clients;
  backup failure precedes deletion; partial/bounded runs resume and restore;
  changed or newly referenced records are retained, in both roots.
- RED: public-fetch test module was absent; GREEN: 11 public-fetch tests cover
  unsafe IP encodings, mixed DNS answers, redirect/DNS changes, pinned native
  HTTP request options, compressed response handling, oversized bodies, all-stage
  deadlines, a maximum of four transports and sanitized errors. Synthetic native
  request tests do not open sockets.
- Separate bypass/caller review found the scheduled RSS wrapper did not forward
  the injected resolver; a regression failed with zero resolver calls, then passed
  after forwarding it. No surviving alternate fetch path was found in stream/RSS
  callers. Telegram uses its separate fixed API endpoint and was not changed.
- GREEN: full Functions suite on Node 22: **119 passed, 0 failed/skipped**;
  `npm --prefix functions run lint` passes, including both new/affected modules.
- GREEN: seed/migration/cleanup unit suites passed 22 tests before the additional
  project-mismatch test; the final focused cleanup suite passes 5 tests. Do not
  conflate these overlapping runs into a unique-test total.
- Flutter baseline: **276 tests passed**. Analyzer first reproduced the documented
  `TickerMode.of` issue, then `flutter analyze --no-pub` passed with no issues after
  `TickerMode.valuesOf(context).enabled`. Both existing now-playing widget tests
  pass after the change; their simulated playback errors are expected fixture
  output. Android/iOS builds and physical-device sessions are still pending.
- Public web on Node 22: **46 tests passed**, typecheck passed, Development-root
  client/SSR build passed. Existing >500 kB chunk warning remains; no performance
  improvement is claimed. Browser acceptance is pending.
- Governance and `git diff --check` pass. Only source, tests, scripts and project
  documentation changed; no deployment, live migration, signing or store action.

### Second implementation tranche — trusted saves and imports

First tranche commit: `c512459`. Current tranche extends the same local branch;
no push/deployment/live data mutation has occurred.

- Added `functions/lib/admin-content.js` for editable field/type/date validation,
  stable comparisons, canonical natural identities and server-owned initial stats;
  added `admin-content-relations.js` for transactional parents/counters/locations,
  child transfers and natural-key reservations.
- `saveAdminContent` now requires an explicit nullable edit snapshot, preserves
  creation/backend fields, supports banners, detects stale edits, and makes
  equivalent retries return unchanged. Imports reserve identities atomically
  instead of trying a separate write and ignoring reservation errors.
- Editor/import callers use `getFunctions(firestore.app)` and portable dates;
  attribution/default counters no longer come from the browser. Import results
  distinguish an unchanged server replay and a concurrent identity conflict.
  A cross-root preview is rejected before any callable invocation.
- The admin form can specify location type and upgrades missing legacy types in
  form state. Reference comparison preserves the existing legacy governorate/
  national inference. Episode audio validation now requires HTTPS like Flutter,
  web playback and the backend; existing HTTP station URL support is preserved.
- RED/GREEN: new server schema tests, counter/retry/transfer/location and concurrent
  importer regressions, request-builder tests, cross-root preview rejection,
  episode HTTPS parity and legacy-empty-list comparisons were observed failing
  before their implementation, then passing.
- Both-root native Firestore transaction suite: **16 passed**, including audit
  failure rolling back content/counter/reservation, off-page child transfer racing
  episode creation, duplicate key races, stale edits and location projection.
- Real client/Auth/Functions integration: **12 passed, no skips**. This covers the
  actual exported production callable, guest and station-admin denial/control
  cases, editor transfer/stale/counter behavior, and import create/update/replay.
  An initial legacy fixture still supplied browser defaults, and one test import
  was missing; those fixture/harness failures were corrected before acceptance.
- The first full Functions-emulator run registered unrelated event handlers and
  made output noisy. `tool/run-admin-emulator-tests.mjs` now stages a temporary
  codebase exporting only the actual production save callable. It does not copy
  developer env/secret files and removes only its own temporary directory.
- Final full Functions suite: **125 passed, 0 failed/skipped** on Node 22.23.4;
  Functions syntax checks include both new modules. The schema suite includes the
  regression for legacy empty list entries without false stale conflicts.
- Admin unit suite: **71 passed**, 11 emulator-dependent tests skipped in that run;
  the added authorization case makes 12 emulator cases, all executed separately
  without skips above. Admin typecheck/lint and Development-root build passed;
  existing chunk warning remains, with no performance claim.

### Next action: finish NOV-05 deletion and Rules enforcement

The production editor/import paths are callable-based, but Rules still allow
direct SDK content and import-key mutation, and existing deletions do not append
an audit entry. This is a known incomplete acceptance gate, not a closed finding.
Port deletion to a trusted callable while retaining `delete-episode.ts`'s fence:
acquire deletion marker, query comments, then verify marker/snapshot and commit
deletion, parent decrement, identity release and audit atomically; clear only the
calling attempt's marker on failure. Preserve child/counter/stale guards for
station/program deletion and existing non-content deletion behavior.

Update the isolated emulator runner to export the production delete callable as
well. Use the existing episode-deletion and admin save/import emulator tests
through real Auth/Functions, and seed fixtures with Admin SDK when Rules close
client mutations. Tighten direct client content/identity writes only after all
legitimate write paths have moved; preserve unrelated comment/moderation/account
flows. Move or replace now-unused client relationship helpers/tests only after
their off-page/concurrency/limit behavior is covered on the server. Prepare a
compatible backend→admin→Rules release sequence. A reviewed legacy natural-key
backfill tool is needed in NOV-07 for parent scopes above the first-claim bound.

Retain the original client helpers as migration references until their regression
coverage is represented at the trusted boundary. Current save/import behavior
and known remaining enforcement gaps are described above. NOV-06/07/09/10 and
full NOV-11 acceptance remain required; the goal is active.
