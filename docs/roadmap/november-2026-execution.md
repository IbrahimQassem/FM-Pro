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
| NOV-05 | Source/emulator acceptance verified | Real save/delete/moderation callables, atomic audit/counters/identity release, full delete preconditions and comment fence; direct client mutations denied. Rules33, editorial37 and real Auth/Functions14 tests pass. Compatible backend→admin→Rules rollout remains external. |
| NOV-06 | Source/emulator acceptance verified | Shared leases/outcomes for programs, episode devices and manual broadcasts; native18 and Functions147 pass. Stable composer intent and isolated topics verified; real-device FCM and browser acceptance remain NOV-11. |
| NOV-07 | Regional/import source and emulator checks pass; owner gate pending | Regional schema/client compatibility and atomic preview/apply/restore verified; identity backfill/RSS concurrency verified. Legacy governorate coverage still awaits owner validation; no live migration. |
| NOV-08 | Source/widget/browser checks pass | Fresh/stale/unknown/no-source labels agree; archive sources no longer claim a source outage. Actual browser archive navigation and native test fixtures verified. Final device matrix remains NOV-11. |
| NOV-09 | Source/widget/browser checks pass | Optional client-only healthy filter composes with city/search/favorites; native45-minute boundaries and local refresh clocks; default all/archive recovery, AR/EN200-percent tests and desktop/mobile browser checks pass. |
| NOV-10 | Source/widget acceptance verified; device gate pending | Native progress and identity-bound serialized seeking use one player; AR/EN200-percent, unknown/live/rejection/disposal tests pass. Physical background/interruption acceptance remains external. |
| NOV-11 | Local evidence package saved; external gates pending | Full Flutter301, analyzer/format/governance, Functions147, editorial37, Rules33, real Admin14, profile images3, maintenance24 and Android/iOS builds pass. See docs/release/november-2026-local-acceptance.md. No physical phone or owner geography acceptance. |

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

### Third implementation tranche — audited deletion and closed Rules

- Server deletion validates full stored snapshots, actual parent ownership before
  any fence, comment/child guards and counters; commits deletion, own key release,
  decrement and audit together. Retry and ID-reuse regressions pass.
- Moderation moved to `adminReviewReport` so the browser needs no episode counter
  write permission. Both station-admin/moderator own-station controls and cross-
  station/account-disable denials pass through actual Auth/HTTP.
- Rules deny direct canonical content, import-key, catalog-revision, moderation
  decision and comment state mutations even from admin clients. Listener comment/
  report creation and unrelated user behavior remain covered.
- RED: new direct-write denials failed under the old Rules. Legacy positive
  direct-write assertions and aggregate fixture setup were migrated to the proper
  server boundary; no listener authorization was broadened.
- GREEN: Rules31, native editorial20, actual Auth/Functions admin14, all without
  failures/skips. Functions131; admin unit71 (14 emulator cases intentionally
  skipped here and separately executed above). Admin typecheck/lint/build and
  Functions lint pass; known chunk warning remains.
- New deletion snapshots preserve extra coordinate-map fields; parent authorization
  precedes fence writes. Both regressions observed RED then GREEN.
- Backend→compatible admin→Rules is the documented release order. No deployment,
  live operation, push or further commit. Account-deletion compatibility run pending.

### NOV-06 delivery decision and next action

Builder decision within the authorized reliability scope: retain current FCM topic
program sends and subscription/device episode audience. Use a durable private
operation record and transaction lease, not a new queue/provider. States are
`pending` (claimed/sending phase), `sent` (provider acknowledgement, not proof of
receipt), `failed` (definite rejection), and `unknown` (lost acknowledgement or
expired sending lease). Known retryable provider rejection uses bounded backoff;
unknown is never automatically resent. A prepared lease can be reclaimed; once
sending begins an expired lease becomes unknown. This prefers an explicit uncertain
result over an automatic potential duplicate. No exactly-once promise.

Alternatives considered: stamping before send loses known failures; stamping after
send alone allows concurrent duplicates; a full messaging system is unnecessary
for this bounded repair. Program operation key will scope program/day under its
root; episode device receipts retain their existing job/device identity. Never
store raw transport errors, tokens or user data in operation outcomes. Keep
existing opt-out/deletion/root checks immediately before sending.

Shared helper unit tests observed RED (missing module) then4 GREEN. Integration
into both senders and real transaction concurrency/retry/lost-ack acceptance remain
next; NOV-06 is not complete. NOV-07/09/10 and NOV-11 remain fully in scope.

### NOV-06 integration checkpoint

- Programs and per-device episode deliveries now use the shared lease protocol.
  Native both-root tests reproduced duplicate sends on lost acknowledgement and
  expired in-flight job leases (4 failures), then12/12 passed after the repair.
- Expanded native tests for program claims, known rejection retry, lost ack,
  private Rules and retention passed16/16 without skips. Manual broadcast native
  recovery tests have now been added and their run is pending.
- Manual broadcasts were also in REV-05 scope: added stable caller/root intent
  identity, payload binding, pre-send history and trusted receipt-based recovery.
  Unit tests cover concurrency, lost ack and history-write failure without resend.
  Full Functions suite146/146 passes; no actual FCM send.
- Admin retry ID helper1/1; Flutter repository5/5 pass with both-root topic
  reconciliation, opt-out and explicit cross-root message rejection.
- New Rules denial for forged broadcast history observed RED; Rules now close
  create/update while retaining super-admin read/delete. Final Rules run pending.
- Admin typecheck/lint/build and whole Flutter checks must be rerun after the new
  broadcast UI/repository changes. No completion claim yet for NOV-06.

### Current integrated verification

Rules32/32, notifications native18/18, Functions146/146, full Flutter279/279,
Flutter analyzer clean, admin unit72 pass (14 emulator cases separately14/14),
admin typecheck/lint/build pass after the broadcast UI change. Chunk warning
remains. No real FCM/device/browser acceptance is implied. All edits remain local
and uncommitted under the latest user instruction.

### NOV-07 reconnaissance and next action

- Geography choice has been sent asynchronously to the owner: preserve current
  IDs while distinguishing cities and adding missing governorates, or retain the
  current set as coverage areas. No catalog source changed yet.
- Existing first-claim bounds would still block a *new* identity in a >450 parent
  scope even after per-record backfill. The migration therefore needs a trusted
  completed-scope marker, proof that scope membership did not change, and atomic
  reservation writes/checkpoints before enabling that fast path.
- RSS still uses read-then-batch content writes without the shared identity
  reservation. It must participate in this invariant before a scope marker can be
  treated as proof of full coverage. No source change to RSS for this stage yet.
- Proposed bounded implementation: explicit project/root/kind/parent dry-run,
  immutable hash-bound manifest and backup, duplicate/malformed-key blockers,
  create-only keys with per-item checkpoints, parent-version preconditions,
  completed marker after every item, and rollback that removes only run-owned
  unchanged keys and first closes its own marker. No live apply/restore.

### NOV-07 identity migration acceptance

The completed-scope fast path, create-only backfill, precise parent/version/count
proof, backup-before-mutation, cursor-bound resume, exclusive scope ownership and
run-owned rollback now pass native tests. RSS uses the same natural-key transaction
with episode/counter/audit and validates current parents. Native editorial suite
33/33, maintenance unit16/16, Functions146/146 and Rules33/33 pass. RSS unit commit
failure/partial retry controls were preserved when adapting the transaction fake.
A flaky global audit count in the preexisting native test was scoped to its target
to isolate concurrent test files; the audit assertion remains exact. No live
backfill/restore/catalog mutation has occurred. Geography remains pending.

Android debug build passes after notification changes (existing KGP migration
warning). iOS simulator build is running; no signing/store/device-delivery claim.

### NOV-08/09 listener discovery acceptance

- Flutter state/controller and public discovery predicates compose city, search,
  favorites and the optional working-stream filter (recent library also on web).
  Default remains all. Native source, fresh online result and zero failures are
  required; unknown/archive sources remain accessible when the filter is off.
- Local boundary timers/focus/resume recalculate freshness without network
  polling. Malformed failure counters no longer become healthy zero values.
  Invalid/out-of-range dates remain unknown and schedule no impossible deadline.
- Public cards/details now share health labels: stale is unverified and no-source
  is an archive state, not an assertion of source outage. Details show last-check
  time and keep recordings navigable while live controls are unavailable.
- RED/GREEN: domain freshness/composition/deadline tests, malformed counters in
  Flutter/admin/web, invalid date deadlines. Full Flutter286 pass, analyzer clean;
  public51 pass, admin73 pass with14 separately executed emulator cases.
- CUA Chrome/Playwright QA on the synthetic localhost preview:3→healthy1;
  favorites+city+search→0; showall→3; keyboard and mouse archive-detail navigation
  expose episode controls without a false outage disclaimer. Desktop and390×844
  viewport pass, contentWidth390, console clean. Viewport restored; synthetic
  favorite restored. IAB was unavailable, standalone npx Playwright failed DNS;
  no dependency was installed.
- Screenshots: /tmp/hudhud-working-desktop.png, /tmp/hudhud-working-mobile.png,
  /tmp/hudhud-working-desktop-empty.png, /tmp/hudhud-working-archive.png. No real
  audio playback or remote account/data action was used for these checks.
- Android/iOS builds passed before the discovery change; rerun current artifacts
  after episode integration. iOS regenerated CocoaPods/SPM integration files that
  were preserved, not discarded. SPM was already configured and Firebase remains
  pinned12.18.0. Before/after/patch artifacts are saved outside the repo.


### Regional scope and recorded-progress checkpoint —2026-10-24

- NOV-07 region source prepared: ARAB is an internal region code, global-ar ID
  is stable, locationType is regional. Flutter/Admin/Public keep it discoverable;
  YE/global-ar remains visible during rollout. SEO does not fabricate a postal
  country for the regional scope. The legacy22-entry coverage catalog still
  needs owner validation; no city IDs were renamed/reassigned by assumption.
- New tool/migrate_regional_location.mjs defaults to preview. Explicit target,
  source versions/membership, verified private backup, atomic <=450 scope,
  revisions/checkpoint/audit, concurrency/retry/restore are emulator verified.
  Legacy seed/station tools refuse the new regional direct-update path.
- Native editorial37/37, Functions147/147, public53/53, admin74 passed with14
  emulator-only skips (separate callable coverage retained). Maintenance21/21.
  Flutter player/domain55/55 and analyzer clean after corrected nullability;
  final full Flutter/platform builds are still running or next. Do not substitute
  previous builds for these source changes.
- NOV-10 source/model/native/repository/controller/progress provider/controls
  and ARB are complete locally. Timer stops without listeners, paused progress
  replays, seek is serialized with source loads and generation checked, rejected
  seek preserves playback, and widgets handle unknown/live/disposal safely.
- Next: final checks/build artifacts and acceptance matrix, latest browser
  regional/mobile evidence, then owner/device gates. No Commit/Reset/push,
  deployment, production migration, signing or real FCM was performed.


### Final local verification

The latest Android debug and iOS simulator builds passed. Full Flutter301/301,
analyzer clean,209 Dart files already formatted, governance/diff whitespace pass.
Rules33/33, real admin14/14, profile images3/3, maintenance24/24, public53/53,
admin74 with14 separately covered emulator skips, Functions147/147 and native
editorial37/37 pass. Web typecheck/lint/Development builds pass. The acceptance
record contains working-tree and artifact hashes, browser evidence, preserved
iOS generated changes, known future warnings and explicit not-ready gates.

No physical Android/iOS phone was available (iOS simulator/macOS/browser only).
Owner validation of the legacy geography list and physical audio/FCM acceptance
remain open. No live catalog preview or migration was run. No Commit/Reset/push,
production/store signing, deployment or external messages were performed.


### Completion audit follow-up

Actual screen-reader actions exposed a separated progress label/value. A minimal
MergeSemantics change now exposes one named adjustable control; AR/EN200-percent
semantic increase/decrease and Tab/arrowUp pass. Full Flutter301, analyzer and
both platform builds were rerun successfully. Current log prefix is
`/tmp/hudhud-nov-a11y-`; the local acceptance record has refreshed source/APK hashes
and a complete427-entry iOS bundle manifest. Previous/candidate artifacts are
preserved in local temporary archives with verified checksums.

All22 geographic IDs now have a concrete owner-review table. The model-choice
question was sent asynchronously and remains unanswered. No physical phone was
found on recheck. The completion audit and device worksheet keep these gates
open; neither repeated green tests nor elapsed time constitutes their acceptance.
