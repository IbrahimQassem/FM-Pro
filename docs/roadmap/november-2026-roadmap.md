# November 2026 roadmap — reliability and listener experience

Prepared: 2026-10-24. Planning window: November 1–30, 2026.
Status: implementation authorized by the user on 2026-10-24; execution is tracked
in [the execution record](november-2026-execution.md). Deployment approval is separate.
Baseline: `main@5eac31c`; see the [weekly development review](development-review-2026-10-24.md)
for findings, evidence and verification limits.

## 1. Outcome and planning assumptions

Make recent development safe to operate, then help listeners find working
stations and navigate recorded episodes. Preserve Riverpod, the existing player,
Firebase roots, web frameworks, routing, localization and repository boundaries.
No new dependency or architectural rewrite is assumed.

Capacity and staffing were not supplied. Dates below are sequencing targets,
not effort estimates or delivery promises. Owners are roles, not assigned people.
Suggested allocation: 60% reliability/data integrity, 25% listener improvements,
15% integration/device acceptance. If fixes exceed that capacity, reduce feature
scope before reducing validation. Limit active implementation to one backend/data
slice and one client slice with nonoverlapping file ownership.

Three approaches were considered:

- **Stabilization only:** lowest delivery risk, but little new listener value.
- **Reliability-led with two bounded features — recommended:** close critical
  gaps, add working-stream discovery, then a limited episode-player upgrade.
- **Broad feature expansion:** library, program following, feed and PWA together;
  defer because foundations and end-to-end acceptance remain incomplete.

The user authorized implementation of this roadmap on 2026-10-24. Existing
[platform plan](platform-development-plan.md) and
[October package plan](governorates-stream-import-card-roadmap-2026-10.md) remain
the long-term references; this document selects November slices rather than
marking all their parent work complete.

## 2. Ordered backlog

Size is relative (S/M/L), not a time estimate. P0 findings should be addressed
before the affected endpoint is deployed or cleanup is run, even before November.

| ID / priority / size | Deliverable and source scope | Owner / dependencies | Acceptance |
|---|---|---|---|
| NOV-01 / P0 / S–M | Reconcile the development branch and establish a commit-bound baseline. Covers PL-06/07. | Delivery + Quality; first | Verify branch ancestry and integrate reviewed `main` changes into `hudhud_fm` without force/history rewrite; record exact SHA, supported Node 22/Flutter versions and separate pass/fail/skip results. Direct pushes still run the same checks. No assumption that branch naming proves deployed state. |
| NOV-02 / P0 / M | Close REV-01 in `editorial-audit.js` and callable tests. | Firebase; NOV-01 | Negative tests for current/destination station ownership, spoofed claims/actor fields, missing parents, cross-root paths and deletion markers; own-station edits still work. Run both-root emulator/callable acceptance. |
| NOV-03 / P0 / M | Make old-location cleanup recoverable and opt-in (REV-02). | Data + Operations; NOV-01 | Read-only default, explicit root/project/apply/report, backup verified before first deletion, referenced records protected, bounded batches/checkpoints; emulator failure/resume/restore tests. No live cleanup in the implementation slice. |
| NOV-04 / P1 / M–L | Complete stream/RSS destination protection and bounded fetches (REV-03, PL-08). | Firebase + Playback; NOV-01 | Injected resolver/fetch tests cover IPv4/IPv6, DNS and redirect changes, oversized bodies/timeouts and valid sources; no unsafe endpoint reached. Measure job budget before expanding volume. |
| NOV-05 / P1 / L | Complete trusted editorial audit integration (REV-04, PKG-10). | Firebase + Admin; NOV-02 | Editor and import use the same relationship-aware trusted write semantics; content/counters/audit atomic; creation metadata immutable; update/transfer/stale-edit/retry cases covered. Preserve existing `saveWithRelations` behavior when moving authority; no parallel weaker write path. Audit actor data remains restricted. |
| NOV-06 / P1 / M–L | Repair notification retry/concurrency semantics (REV-05, PL-04). | Notifications + Firebase; NOV-01 | Define operation key, claim/lease and pending/sent/failed/unknown transitions; known failures retry, uncertain delivery is explicit; concurrent jobs do not independently claim one operation; environment audience and opt-out fixtures pass. Real-device delivery remains a separate gate. |
| NOV-07 / P1 / M | Correct regional location semantics and finish location/import acceptance (REV-06, PKG-01/03/07). | Content + Data + Admin/Flutter/Web; NOV-03, NOV-05 for audited imports | Owner validates reference catalog; pan-Arab scope has a documented type that is not a Yemeni governorate; clients keep these stations visible. Preview affected records; resolve ambiguities; concurrent/retried import adds no duplicates. No production migration claimed from unit tests. |
| NOV-08 / P1 / S–M | Align stream-health presentation and clear analyzer debt (REV-07/08). | Flutter + Web + Quality; NOV-01 | Fresh/stale/unknown/backup fixtures agree across cards/details; last-check age shown where relevant; source outage not inferred from local device failure. Replace deprecated ticker API and pass analyzer/widget checks. |
| NOV-09 / P2 / M | **New: working-stream discovery for listeners.** Extend existing admin filter semantics into Flutter and public web. | Product + Flutter/Web; NOV-04, NOV-07, NOV-08 | Optional “working streams” filter combines with city/search/favorites; default still shows all stations. Only fresh online, zero-failure results qualify under the 45-minute contract; label as last checked, not a playback guarantee. Unknown/offline stations and archives remain reachable. Empty/offline, AR/EN, RTL and accessibility covered. |
| NOV-10 / P2 / M, expandable | **New: recorded-episode progress and seeking.** Extend existing audio repository/controller, not a second player. | Playback + Flutter; NOV-08 and playback-contract update | Show elapsed/duration and seek for seekable episodes only; pause/resume and live-to-episode switching preserve single-player ownership. Unknown duration/nonseekable streams handled explicitly. Screen-reader controls and real-device interruption/background checks pass. Persistence and speed are stretch below. |
| NOV-11 / P1 / M–L | Integrated acceptance and release decision package. | Quality + Release; all included changes | Current-SHA automated evidence, browser/device matrix, migration previews, known issues and recovery plan; no unresolved P0 in shipped scope. Release/deployment remains a separately authorized action. |

NOV-05 is intentionally large: simply replacing the UI's save call would drop
counter, transfer and conflict protections. Split it into backend parity tests,
trusted transaction implementation, and client/import integration before coding.
Likewise split NOV-06 after its delivery-state decision; do not implement an
unbounded messaging subsystem for a retry fix.

## 3. Weekly sequencing

| Window | Primary work | Exit / scope decision |
|---|---|---|
| Before Nov 1 when practical | Triage REV-01/02; establish whether affected code/tools have been deployed or used. | Do not defer confirmed critical-path fixes merely to match the calendar. No assumption about production exposure. |
| Nov 1–7 | NOV-01/02/03; start NOV-04; prepare NOV-05 parity fixtures. | Reviewed branch baseline; ownership regression rejected; cleanup safe in emulator; unsupported-runtime results replaced with Node 22 evidence. |
| Nov 8–14 | NOV-04/05/06, with backend slices sequenced by file ownership. | Trusted audited saves and explicit delivery failure states pass integration tests. If unfinished, carry them forward and cut NOV-10 first. |
| Nov 15–21 | NOV-07/08; NOV-09 after dependencies pass. | Correct geographic classification, consistent freshness messaging, accepted working-stream discovery. NOV-10 starts only if reliability capacity permits. |
| Nov 22–28 | NOV-10 if feasible; NOV-11 regression/device acceptance. | Feature freeze for accepted scope; no large new feature starts. Collect artifact-specific evidence and remaining blocker owners. |
| Nov 29–30 | Fix acceptance regressions, publish internal evidence summary and plan December. | Explicit ready/not-ready decision per platform; unfinished work carries forward with evidence, not an implied completed status. |

Minimum November outcome: NOV-01–08 plus NOV-11, with NOV-09 preferred if capacity
allows. NOV-10 is the first planned feature to move into December. There is no
commitment to complete every card with an unknown team capacity.

## 4. Feature details and deferred scope

For NOV-09, reuse existing health models and filtering structure. Resolve the
same shared fixture cases on Flutter and web, including exactly 45 minutes,
older checks, missing/invalid times and backup-source status. The filter must
not claim to have checked unloaded records. Do not add a new live listener or
background probe from the client.

For NOV-10, first inspect all audio repository implementations/fakes and update
the playback contract. Keep the first slice to position/duration and seeking.
If that passes early, propose local resume position and speed selection as a
separate slice, with retention/account-switch semantics, bounded writes, and
tests for completion, deleted episodes and invalid positions. Cross-device
history synchronization and audio downloading are excluded from November.

Defer full program follows/new-episode feed (PL-13), cross-platform library
expansion (PL-12), PWA/offline shell (PL-17), AI recommendations, expanded ad
products and whole-site redesign. Existing favorites types and station follows
should be reused when those features are scheduled. Add pagination only after
measuring catalog reads/size and defining notification-target resolution outside
the current page; no speculative cache layer or wholesale query rewrite.

## 5. Measurement, verification and completion

Use a baseline on the same fixture set/device/network rather than invented
production metrics. At month end require:

- Zero open P0 findings in the included release scope.
- Every included fix has a failing-before/passing-after regression where isolated.
- All sampled editor/import operations create one corresponding audit entry;
  rejected writes create neither content changes nor successful-operation logs.
- Re-importing unchanged data creates zero new content records; a two-worker
  synthetic race and partial-failure retry retain consistent counts.
- Notification tests distinguish failed and uncertain delivery; a stale date
  marker cannot silently classify a known failure as delivered.
- Health fixtures agree across clients, including stale and unknown data.
- Feature acceptance covers keyboard/screen reader, small screens, RTL and 200%
  text scaling, along with loading/empty/offline/error states.
- Measure play-to-playing and failure/fallback behavior before/after player work
  on agreed devices; investigate any regression. Do not substitute invented
  latency targets for a measured baseline.

Follow the [quality contract](../contracts/quality-release-contract.md) and
[workspace verification matrix](../operations/codex-workspace-setup.md). Capture
commands, versions, commit SHA, artifact identity and sanitized results:

- Governance, format, `flutter analyze`, `flutter test`, Android debug build;
  iOS simulator build for the shared player/platform changes.
- Functions lint/tests; Rules/admin/subscription emulators for affected writes;
  account-deletion/profile-image suites where shared account behavior changes.
- Admin tests/lint/explicit TypeScript check and Development-root build; public
  web tests/lint/build (includes typecheck).
- Seed/migration tests, synthetic dry-run/restore evidence and import races.
- Browser acceptance and Android/iOS physical-device audio sessions, including
  >30 minutes in background, interruption, Bluetooth and offline recovery.

Retain prior artifacts and use reviewed revert/forward-fix changes for rollback.
Data work requires restore evidence before apply. Contract/schema changes must
remain compatible with older clients or have a staged migration plan. Keep
device/external-provider checks marked pending until actually performed; the
October 19 release record cannot certify November artifacts.

## 6. Decisions to settle at kickoff

These do not block this draft: confirm available engineering/device capacity;
name a release owner; confirm November's preferred feature if only one fits;
choose the regional location representation; and confirm whether any October
changes have reached production. Do not infer deployment from merged branches.

On each completed card, add its implementation SHA, acceptance evidence, open
limitations and the related PL/PKG/REV IDs. Update the older plan only for the
specific acceptance criteria actually closed.
