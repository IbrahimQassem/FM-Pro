# Flutter app review and development plan

Date: 2026-09-08  
Status: Implementation active; see the 2026-09-08 checkpoint below.  
Baseline: `cad18cb`, clean working tree before this documentation change.  
Target: `lib/`, `test/`, and development-only platform verification.

## 1. Outcome and boundaries

Refine the existing Arabic-first Flutter listener app into a consistent, reliable
experience for discovering stations, listening live or to episodes, and managing
account/community interactions. Use the same incremental planning and acceptance
approach as the [admin redesign](admin-web-redesign-plan.md).

This is a source-based engineering and development review, not a screenshot-based
visual audit or certification of device behavior. Findings below distinguish
observed code behavior from risks requiring reproduction. Track completion in the
[Flutter acceptance audit](flutter-app-acceptance-audit.md).

**App release is excluded.** No store submission, signing, release packages,
production configuration, deployment, production data migration, store policy
checklists, or rollout tasks belong to this plan. Local debug builds and device
checks are development verification. Existing release documents remain separate.

Preserve Riverpod, feature-first layering, Navigator/MaterialPageRoute, the shared
audio player, Arabic/English ARB keys, burgundy/warm-surface identity and mascot
assets. Do not introduce a second app, bottom navigation, router, state library,
or new dependency merely to refresh the appearance. No implementation code was
changed during this review.

## 2. Current architecture and capability map

`lib/app/providers.dart` composes repository/data-source dependencies and feature
controllers. Home and station content use cache then server refresh; comments
use a screen-scoped listener; favorites follow account identity; one long-lived
player serves stations and episodes. Account, notification and onboarding flows
already exist and should be improved rather than rebuilt.

| Journey | Existing behavior and source | Development focus |
| --- | --- | --- |
| Startup | `features/splash/`, `features/onboarding/`, `app/firebase_bootstrap.dart` | Loading/setup/retry, returning user, replayed tour, reduced motion |
| Home discovery | `features/home/`: search, active city references, grid/list, banners, station favorites filter | Initialization resilience, stale refreshes, filter/state feedback, hierarchy |
| Station details | `station_details_screen.dart`: live playback, favorites, sharing, programs/schedule/about | Action consistency, readable metadata, long content and player clearance |
| Programs and episodes | `features/station_content/`: station-level content fetch, published episode list, comments/play/share | Correct sharing, freshness, schedule readability, measured read volume |
| Playback | `features/player/`: shared live/episode player and background integration | Request races, live versus recorded metadata, recovery and device behavior |
| Favorites | Station controls and Home filter; model supports additional target types | Identity isolation and concurrent writes first; library expansion later |
| Account | Separate sign-in/register/manage-account flows, verification, linking, deletion, profile images | Cancellation, retries, keyboard/RTL, same-account profile refresh and platform checks |
| Community | `features/comments/`: public reading, acceptance, reporting and personal blocking | Error recovery, long lists/text, moderation parity with admin |
| Notifications | Explicit opt-in; latest 20 session messages, no persistent inbox | Failed initialization recovery, permission transitions, truthful session wording |
| Sharing/about/settings | `core/services/share_service.dart`, account widgets | Accurate localized copy, plugin errors, readable information pages |
| Subscriptions/library/deep links | No listener subscription feature directory or unified library found; share uses store links; banners have no tap handler | Separate extensions requiring contract decisions; not existing functionality |

Paths above are relative to `lib/` unless stated otherwise. There is no
`integration_test/` directory in this baseline. Existing unit/widget tests are
valuable, but do not establish complete device journeys.

## 3. Review findings

P1 means fix before feature expansion; P2 means address in the relevant refinement
slice. A code finding is not a claim that a device reproduction was performed.

| ID | Priority / evidence | Finding and impact | Smallest planned response |
| --- | --- | --- | --- |
| F01 | P1, observed code; `favorites_controller.dart`, `_onUserChanged` | Switching directly from account A to B retains A's IDs/pending state through `copyWith` until B emits. Old write completions only check `mounted`, so a late failure can restore A's snapshot after logout/switch. | Reset identity-owned state immediately; invalidate old callbacks/write completions with an identity generation. Test delayed A events/completions after B and after logout. |
| F02 | P1, observed code; same controller, `toggleFavoriteStation` | No pending-target guard; rollback replaces the whole favorites set. Overlapping operations can undo another successful optimistic change. Subscription setup keys only on UID, so same-UID verification changes do not rebuild a failed listener. | Serialize/deduplicate per target, isolate rollback to the affected operation, and reconcile eligible account transitions. Test two targets, rapid repeats and same-UID verification. |
| F03 | P1, observed code; `home_controller.dart`, `_initialize` | Preference/user loading is part of an uncaught `Future.wait`; a failure prevents subsequent server refresh. SharedPreferences I/O also lives directly in presentation. | Add a narrow preference repository using existing patterns; isolate optional initialization failures and guard disposal before refresh. Prove discovery still loads when preferences fail. |
| F04 | P1, risk requiring controlled reproduction; Home and station-content `refresh` | No request generation or serialization prevents an older request from overwriting a newer refresh. Home's user loads can similarly complete after identity changes. | Completer-based tests for reversed completion and disposal; add the smallest latest-request/identity protection where reproduced. |
| F05 | P1, risk requiring controlled reproduction; `station_player_controller.dart`, `just_audio_player_data_source.dart` | Different source loads may overlap; controller awaits load then plays without checking whether stop/new selection superseded it. Source replacement uses one boolean and backup attempts can outlive a request. | Test A→B, station→episode, stop during load, stale failure and dispose during load. Coordinate request cancellation/serialization through the existing player boundary. |
| F06 | P2, observed code; `just_audio_player_data_source.dart`, `MediaItem` | Every media item uses `isLive: true`, including finite episodes. | Carry explicit live/recorded metadata through the existing domain item; verify platform metadata. Seeking/progress is a separate product extension. |
| F07 | P2, observed code; `share_service.dart`, `shareEpisode` | The localized `programTitle` parameter receives `station.name`; station is repeated instead of the program title. Share futures also need failure/cancel coverage. | Pass the known program title from ProgramDetails, check all callers, and test Arabic/English payloads plus safe plugin failure behavior. Keep current store-link sharing. |
| F08 | P2, observed code; `firebase_banners_repository.dart`, `banner_carousel.dart` | Visibility is filtered once per read. An open Home can retain an expired banner or omit one whose start time arrives. Carousel index is not reconciled when the list changes. | Define a screen/resume boundary refresh policy without a permanent network listener; test start inclusive/expiry exclusive and shrinking/reordered lists. |
| F09 | P2, observed code; `firebase_notifications_repository.dart`, `initialize` | `_didInitialize` is set before awaited setup completes; partial failure can suppress setup on a later initialization. Controller has no explicit initialization retry action. | Make setup retryable and idempotent with owned cleanup; test failure at each awaited stage, retry and dispose. Keep opt-in and textual payload boundaries. |
| F10 | P2, scale/freshness limitation; `station_content_firestore_data_source.dart`, `program_details_screen.dart` | Reads all episodes for a station without a limit; ProgramDetails receives a snapshot list without refresh. This follows the current contract but may become costly or stale as content grows. | Measure synthetic large catalogs first. If justified, approve program-scoped pagination/freshness semantics and update the owning contract before query changes. |
| F11 | P2, documentation drift | Development proposals still list station favorites as future work; station-content contract excludes sharing although share exists; security storage clause says grid/list only despite onboarding and notification preferences. Playback contract excludes URLs from presentation state while state holds canonical Station/Episode models containing them. | Reconcile each discrepancy with its owner and executable tests; explicitly distinguish safe UI/log projection from internal model ownership. Do not silently change behavior to match stale prose. |

Favorites currently has five controller cases (guest, verification, add/remove,
simple rollback, logout). Player controller tests cover basic selection, toggle,
failure, remote stop and episode loading. The concurrency scenarios above are
not established by those happy-path tests. A dedicated HomeController test file
was not found; HomeState and HomeView tests are present.

## 4. Screen refinement brief

Capture current screenshots with synthetic development content before visual
changes. Review small/large phones, Arabic RTL, English rendering, 100%/200%
text, light/dark themes where supported, keyboard and reduced motion. Record
actual screenshots and observations before calling a visual issue confirmed.

| Surface | Intended refinement | Acceptance |
| --- | --- | --- |
| Home | Clear search/filter hierarchy, restrained banners, consistent station cards and favorites feedback | Search-empty differs from offline/error; refresh preserves content; large text uses readable layout; favorite progress cannot accept duplicate taps |
| Station | One obvious listening action, clear editorial live label, consistent secondary actions | Play/pause/retry/stop agree with mini-player; long Arabic names and descriptions remain accessible |
| Program/episodes | Clear title/presenter/schedule and episode metadata, predictable play/comments/share actions | Correct fixed-offset dates; optional schedules work; long content and empty episodes remain readable |
| Schedule | Readable selected day and local schedule timezone; distinguish live/next/ended | Time boundary/resume behavior is explicit; optional schedule absent without hiding the program |
| Mini-player | Consistent selected title, loading/failure controls and adequate space | Does not obscure last content/action; state persists across supported routes; control labels reflect action |
| Account/auth | Consistent form spacing, validation, focus and recovery; preserve separate sign-in/register flows | Keyboard does not hide submit; cancellation preserves safe state; verification/link/delete failures cannot appear successful |
| Profile image | Clear camera/gallery/mascot choices and upload feedback | Cancel, denial, failed upload and retry preserve prior image; physical device checks recorded separately |
| Comments | Readable composer and distinct report-comment/report-user/block actions | No posting before explicit current-policy acceptance; block/undo and admin hide/remove reflect intended visibility |
| Notifications | Explicit permission and session history wording | No startup permission prompt; denied/off/error states remain distinct; no claim of persistent history |
| Tour/settings/about | Consistent mascot use, text and actions | Skip/replay work; reduced motion respected; ARB parity and accessible controls |

Use existing theme/components first. Extract small shared widgets only when an
actual edited flow demonstrates duplication. File length alone does not justify
rewriting the 780-line comments or 684-line station screen.

## 5. Ordered implementation slices

Estimates are intentionally omitted until failing regression cases and visual
captures establish scope. Execute one reviewable slice at a time.

| Card | Deliverable / likely scope | Depends on | Completion evidence |
| --- | --- | --- | --- |
| FL-00 | Baseline fixtures, screen captures, contract discrepancy decisions and existing lint cleanup; docs and test support | This review | State/screen inventory captured; decisions assigned; analyzer clean; audit updated |
| FL-01 | Favorites identity and concurrency fixes; favorites controller/tests plus Home/details pending feedback | None; first implementation slice | F01/F02 delayed completion, account switch, verification and concurrent-target regressions pass |
| FL-02 | Resilient Home initialization, preference boundary and refresh ordering; Home/controller/repository tests | FL-01 for identity integration | Preference failure still loads stations; stale refresh/profile data cannot win; disposal safe |
| FL-03 | Player request lifecycle and live/recorded metadata; player domain/data/controller/tests | F05 reproduction | Deterministic race tests pass; one player; local audio and interruption matrix verified on affected devices |
| FL-04 | Content correctness: episode sharing, banner timing, schedule boundary behavior | FL-00 | F07/F08 tests pass; localized payload correct; fake-clock and resume checks recorded |
| FL-05 | Home, station, program and mini-player visual refinements | FL-00, FL-02, FL-03, FL-04 | Before/after captures and alternate-state/RTL/200% tests pass |
| FL-06 | Account, profile, comments and notification recovery/accessibility | FL-00; F09 reproduction | Failure/retry/cancel/identity journeys pass; physical checks marked individually |
| FL-07 | Content scaling and refresh contract, only if measurements justify change | FL-05; F10 measurement | Read counts and latency before/after; cache/paging/no-duplicate behavior; relevant Rules tests |
| FL-08 | Cross-feature development acceptance and handoff | FL-01 through FL-06; FL-07 if activated | Audit has evidence for each required row; unresolved device limits explicitly retained |

Start with **FL-01**: write delayed repository/account tests, demonstrate the
failure, implement the minimal controller correction, then verify Home and
StationDetails integration. Capture visuals for FL-00 before FL-05 begins.

## 6. Optional extension backlog

These are separate product decisions, not prerequisites for completing the
existing app refinement. Reuse and update ENG cards in
[development proposals](development-proposals.md) rather than creating competing
implementations.

| Extension | Dependency / scope decision |
| --- | --- |
| Program/episode favorites and My Library | Finish FL-01; define target resolution, unavailable content and pagination; reuse current identity/schema |
| Program follows | Station follows are now required and implemented locally; program follows remain deferred |
| New-episode feed | Station episode alerts are now required and implemented locally; a separate feed remains deferred |
| Canonical content links and tappable banners | Allowlisted parser, deleted/unpublished fallback, cold/background navigation; domain association/deployment remains outside this plan |
| Episode progress/seek/resume | Explicit playback contract and accessibility design; reuse one player, no automatic playback after restart |
| Language/theme preference | Confirm product need and persistence lifecycle; preserve Arabic default and existing ARB parity |

Downloads, monetization and a persistent notification inbox have no approved
implementation scope here.

## 7. Verification and development definition of done

For implementation slices, run from `hudhud_fm`:

```bash
./tool/verify-governance.sh
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test
flutter build apk --debug
```

Add `flutter build ios --simulator --debug` for playback/plugins/platform-impacting
changes. Run the existing relevant emulator/Functions/admin suites when a shared
data or write contract changes; do not run production operations. UI changes need
before/after screenshots and small/large phone, RTL and 200% checks. TalkBack,
VoiceOver, audio focus, headset/Bluetooth and physical camera checks require
actual device evidence; build/unit success cannot substitute for them.

Each card records changed files, regression evidence, commands/results, screenshots
where relevant and unresolved limits in the acceptance audit. No card is complete
solely because code exists. Optional extensions and excluded release work must
not be silently added to the required completion inventory.

## 8. Review baseline verification

- Governance: passed on 2026-09-08.
- `flutter test`: passed, 132 tests on 2026-09-08.
- `flutter analyze`: exited 1 with one existing informational lint, `curly_braces_in_flow_control_structures` at `test/admin_content_contract_test.dart:26:11`. Cleanup belongs to FL-00; no source changes made in this planning task.
- Environment: macOS host, Flutter 3.44.0 stable, Dart 3.12.0; unit/widget test target, no device target.
- Flutter commands initially hit SDK-cache sandbox permissions and were rerun with approved access.
- Native builds, screenshots, integration/device journeys and emulator suites were not run for this documentation-only review.
- Tool output warned that `flutter_facebook_auth` lacks iOS Swift Package Manager support; track in platform development checks, without a dependency upgrade in this plan.
- Atlas Scout navigation was unavailable in the exposed tool catalog; source inspection used focused file reads and text searches.


## 9. Implementation checkpoint — 2026-09-08

The user selected station follow/unfollow, My Stations, working new-episode alert
infrastructure, and relevant-content notification taps without autoplay.
[ADR 0003](../decisions/0003-station-subscriptions-and-alerts.md) records the
accepted contracts. These station capabilities are required, not optional backlog.

Implemented locally:

- FL-01 identity generations, same-UID verification transitions, pending-target
  guards and per-target favorites rollback; Home consumes current favorite state.
- FL-02 preference repository, optional initialization recovery and latest-request
  guards for Home/user/content refreshes.
- FL-03 serialized/invalidation-aware player loads and explicit episode/live metadata.
- FL-04 correct program title in episode sharing, safe share failures, banner
  start/expiry timers and carousel reset; schedule refresh while open/on resume.
- Notification initialization retry/disposal guards, explicit retry action,
  validated content targets, duplicate-open suppression and navigation loading guard.
- Station follow/alert controls and My Stations with account gates, confirmed writes,
  pending/error/offline states and unavailable station references.
- Callable subscription normalization, private device ownership/rotation/logout/
  deletion cleanup, publication markers, paged delivery jobs and bounded retries.
- Latest legacy/canonical opt-outs override stale active duplicates during delivery.

This checkpoint is not completion of every broad visual/device row in the original
review. Full application screenshot parity, screen-reader/device testing, physical
camera/audio/push delivery and catalog-read measurements remain explicit follow-up
items. No new pagination schema was introduced without measurements. No release,
production write, deployment or actual push send was performed.

Current verification and exact remaining inventory are recorded in the
[acceptance audit](flutter-app-acceptance-audit.md) and
[subscription development handoff](flutter-subscriptions-handoff.md).


## Continuation checkpoint — 2026-09-08

The next local refinement pass fixes late cache/layout races, responsive station
headers and auth links, grid controls, minute-aligned schedule updates, and alert
navigation disposal. My Stations, notification initialization, moderation mapping,
account retry and synthetic screen acceptance now have additional regression
coverage. See the [continuation handoff](flutter-continuation-handoff.md) and
[acceptance audit](flutter-app-acceptance-audit.md) for exact evidence and limits.
Pagination remains deferred after synthetic measurement. No release/deployment
work is part of this checkpoint.
