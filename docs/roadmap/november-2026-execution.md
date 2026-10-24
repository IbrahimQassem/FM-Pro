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
| NOV-02 | Boundary fix verified; callable integration continues in NOV-05 | Current/destination ownership, eligible roles, parent existence, deletion markers, allowed fields and server attribution checked. 26 focused tests and 4 both-root emulator tests pass. |
| NOV-03 | Source/emulator acceptance verified | Explicit target, read-only default, typed fsynced backup, stale/reference guards, atomic per-record checkpoints, bounded resume and create-only restore. 5 unit and 6 both-root emulator tests pass. No live operation. |
| NOV-04 | Source/unit acceptance verified | Shared pinned-DNS HTTP(S) transport; manual redirects; body/decompression/deadline/concurrency bounds. 11 focused public-fetch tests plus existing stream/RSS tests pass. Raw network errors sanitized. No live source probes. |
| NOV-05 | Pending | Preserve relationship/transfer/conflict semantics in trusted audited saves; integrate editor/import. |
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

### Next action: NOV-05 trusted saves

Read `web_admin/lib/save-content.ts`, `location-relations.ts`, `program-transfer.ts`,
`relationship-counter.ts`, `content-form.ts`, the actual `commitBatchImport` write
path, and `web_admin/test/save-content.emulator.test.ts`. Port existing relationship,
location identity, child transfer, optimistic conflict and retry semantics into
the trusted save boundary before changing UI callers. Include banners (the
current client save supports them although the new callable does not yet).
Use the existing client Functions instance (`getFunctions(firestore.app)`),
explicit root, portable date encoding, and server-derived actor/default counters.
Audit and content/counters must commit atomically. Import-key reservation currently
happens after the content save and must move into that same trusted transaction
to close the two-import race; a passing mock-only reservation test is insufficient.
Preserve server-only fields, reject forged metadata and test both roots against
the emulator before removing the direct client write path. NOV-06/07/09/10 and
full NOV-11 acceptance remain required; the goal is active.
