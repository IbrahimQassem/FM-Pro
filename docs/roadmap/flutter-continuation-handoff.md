# Flutter continuation handoff

Date: 2026-09-08. Development only; no release, deployment, real push sends,
production writes, new dependencies, or database migrations.

## Delivered behavior

- Home and station content ignore cache completions after a newer refresh. Startup
  does not schedule an extra refresh over the user's request. A delayed saved
  preference cannot undo a new grid/list selection.
- Station details uses a naturally sized scrolling hero with a pinned toolbar;
  large text no longer overflows a fixed-height header. Tabs can scroll at large
  text sizes. Sign-in/register links and social dividers wrap within the screen.
- Station grid cards have space for long titles/statistics; the play action uses
  the existing concise localized label. Favorite targets are at least 48 pixels.
- Schedule updates align with the next wall-clock minute and refresh immediately
  on resume. Banner expiry/removal survives resume and carousel changes; the
  indicator honors the reduced-motion setting.
- Alert navigation safely handles disposal during lookup. Highlighting an episode
  preserves the relative order of other episodes.
- Notification initialization has injectable message streams for platform-failure
  tests and stops if disposed during initial-message retrieval. Normal production
  construction still uses Firebase's streams; no new permission prompt is added.

## Acceptance evidence

The continuation adds regression coverage for My Stations loading/empty/error,
retry, offline unavailable stations, unfollow and account switching; episode
navigation destination/fallback/offline/duplicate/disposal without autoplay;
late caches, reversed refreshes and disposal; banner lifecycle and schedule clock;
provider cancellation, profile retry and deletion retry; and published-only
comment mapping after admin hiding/removal.

The seven-screen matrix covers Home, station details, program details, account,
sign-in, register and My Stations in Arabic/English. It uses 430×932 at 100% text
and 360×800 at 200%, with the existing light theme (no dark theme is implemented).
Home/station/program include the mini-player. Sign-in/register test keyboard
insets. My Stations passes Android tap-target and labeled-target guidelines.

- Captures: `build/review/continuation/before/` and `after/`.
- Baseline station-header overflow: 77 pixels at 200%; sign-in link overflow up to
  172 pixels in English; English station statistics also overflowed.
- Representative corrected captures were visually inspected. Register was added
  to the matrix after the shared auth-layout correction; no register baseline is
  claimed. Initial account capture required the synthetic auth stream to emit.
- Captures use the optional `HUDHUD_REVIEW_FONT` local font substitute. They are
  widget-rendered evidence, not native-font/device screenshots or golden files.
  Flutter test shadows may differ from native rendering.

## Catalog decision

`test/review/catalog_measurement_test.dart` maps and sorts 100, 1,000 and 10,000
synthetic episodes, discarding a warmup and recording the median of five samples
in `build/review/continuation/catalog-measurement.json`.

The source query fetches all station programs and episodes in two parallel
queries. Returned episode documents therefore scale with the complete episode
catalog, before adding programs; this is a source-based estimate, not a billed
read measurement. The benchmark excludes network, rendering and device profiling.

| Synthetic episodes | Median mapping + sort |
| --- | --- |
| 100 | 2.90 ms |
| 1,000 | 13.17 ms |
| 10,000 | 36.20 ms |

Pagination remains deferred. Any subsequent paging proposal must define the
program/episode query boundary and preserve alert lookup and schedule behavior.

## Verification

| Check | Result |
| --- | --- |
| Full Flutter suite | 201 passed (48 additional tests versus the prior 153-test checkpoint) |
| Screen matrix without optional local font | 28 passed |
| Flutter analysis | No issues |
| Dart format check | 173 files; zero changes |
| Android debug build | Passed; `build/app/outputs/flutter-apk/app-debug.apk` |
| iOS simulator debug build | Passed; `build/ios/iphonesimulator/Runner.app` |
| Governance and diff whitespace | Passed |

Commands used `flutter test`, `flutter analyze`, `dart format --output=none
--set-exit-if-changed lib test`, `flutter build apk --debug`, and `flutter build ios
--simulator --debug`. Logs are `/tmp/hudhud-continuation-*`; the final suite log is
`/tmp/hudhud-continuation-tests-final.log`. The screenshot run additionally supplied
`HUDHUD_REVIEW_FONT` pointing to an available local font. No font dependency or
absolute developer path is committed into application code.

Backend, Rules and admin source were not changed in this continuation; their
previous emulator results remain recorded in the subscription handoff, not
claimed as new runs.

## Changed files in this continuation

Application changes:

- `lib/features/home/presentation/controllers/home_controller.dart`
- `lib/features/home/presentation/widgets/home_view.dart`
- `lib/features/home/presentation/widgets/station_card.dart`
- `lib/features/home/presentation/widgets/banner_carousel.dart`
- `lib/features/station_content/presentation/controllers/station_content_controller.dart`
- `lib/features/station_content/presentation/program_details_screen.dart`
- `lib/features/station_details/presentation/station_details_screen.dart`
- `lib/features/account/presentation/sign_in_screen.dart`
- `lib/features/account/presentation/register_screen.dart`
- `lib/features/notifications/presentation/episode_alert_navigation.dart`
- `lib/features/notifications/data/repositories/firebase_notifications_repository.dart`

Tests and documentation:

- New `test/support/development_fixtures.dart` and `test/review/` screen/catalog tests.
- New My Stations, episode-alert navigation, notification repository, station-clock
  and moderation-visibility tests under their existing feature directories.
- Extended Home, station-content, banner and account-controller tests.
- Updated development proposals, Flutter plan, acceptance audit, docs index and
  this handoff. Prior subscription work remains preserved in the working tree.

## Remaining external evidence

Physical TalkBack/VoiceOver navigation and focus order, native typography, real
FCM receipt/cold launch, OAuth provider setup, camera/gallery permission/cancel/
upload, background/lock-screen audio, audio focus, headset/Bluetooth and network
recovery remain unverified on devices. These limits are not replaced by passing
widget tests or debug builds. No release readiness is asserted.

The SDK regenerated iOS dependency/project files while building. Only those
known-clean generated changes were restored, retaining the repository's existing
configuration. Existing Facebook Auth Swift Package Manager and plugin Kotlin
migration warnings remain; no toolchain/dependency upgrade is included.
