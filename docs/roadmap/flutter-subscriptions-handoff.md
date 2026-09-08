# Flutter station subscriptions — development handoff

Date: 2026-09-08. Local implementation only; no deployment or app release.

## Delivered behavior

Station details now offers follow/unfollow separately from favorites and playback.
My Stations is available in the account hub. Following requires a verified account;
alerts are a separate explicit choice, off by default. Permission denial preserves
the follow. Writes show pending state and only confirm after the callable succeeds.

Publishing a new episode queues an alert for active, alert-enabled station followers.
The worker checks active accounts/content, pages the audience, records per-device
acknowledgements, retries transient failures, removes invalid registrations and
honors newer opt-outs over stale duplicate records. Foreground messages stay in the
session list; taps resolve the episode/program without autoplay and fall back to
station/Home when unavailable. The FCM sender is injected in local tests.

Favorites account isolation/concurrency, Home initialization/refresh ordering,
player load cancellation and episode metadata, episode sharing, banner timing and
notification initialization/navigation also received focused fixes.

## Changed areas

- `lib/features/subscriptions/`: domain repository/state, Firebase data sources,
  account-bound controller, station controls and My Stations.
- `lib/features/notifications/`: validated episode targets, retryable initialization,
  session deduplication and repository-backed Navigator handling.
- Existing Home/player/account/station-content composition and widgets; ARB/generated
  localization files; focused unit/widget regressions.
- `functions/lib/station-subscriptions.js`, `functions/lib/episode-alerts.js` and
  Functions entrypoints: callable writes, private device lifecycle and delivery jobs.
- Firestore indexes, Functions/root test scripts, subscription emulator tests and
  existing account-deletion checks. Existing catch-all Rules protect private paths;
  no additional client permissions were needed.
- Owning contracts, ADR 0003, development plan and acceptance audit.

## Verification

Toolchain: Flutter 3.44.0/Dart 3.12.0, Node 22.23.2 in a temporary local toolchain,
macOS host. Results from this implementation session:

| Command | Result |
| --- | --- |
| `flutter analyze` | Passed, no issues |
| `flutter test` | 153 passed |
| `dart format --output=none --set-exit-if-changed lib test` | Passed; 165 files, 0 changes |
| `flutter build apk --debug` | Passed |
| `flutter build ios --simulator --debug` | Passed after resolving existing packages |
| `npm run lint` / `npm test` in Functions | Passed; 13 tests |
| `npm run emulators:subscriptions` | 7 passed with injected FCM sender |
| `npm run emulators:test` | 25 passed |
| `npm run emulators:account-deletion` | 3 passed, including new device cleanup assertions |
| Governance and `git diff --check` | Passed |

Final debug artifacts: `build/app/outputs/flutter-apk/app-debug.apk` and
`build/ios/iphonesimulator/Runner.app`. Build-generated CocoaPods/project changes
were restored to the original tracked versions, and the generated workspace
Package.resolved was moved to temporary storage. No platform/dependency migration
is included in the delivered diff. One pre-existing test formatting issue was
normalized to satisfy the repository-wide formatting gate.

## Remaining evidence and boundaries

- Deploying the new Functions/indexes is outside this task. The feature cannot
  perform real backend mutations or receive new station alerts against an unchanged
  deployed backend. Treat callable failures as failures, not successful follows.
- No real push, production data or external messages were sent. Physical receipt,
  cold/background taps, audio focus/headset/camera and screen readers remain unverified.
- Synthetic widget captures are generated at `build/review/subscriptions/`; optional
  `HUDHUD_REVIEW_FONT` provides a local review font. These establish local layout,
  not native-platform font rendering or complete screen parity.
- Full visual refinement and catalog scale measurements remain in the acceptance
  audit. No program follows, external deep links, persistent inbox, downloads or
  episode seeking were added.
- iOS initially failed during Swift package resolution; resolving the existing
  workspace packages with Xcode succeeded, and the simulator build was retried.
- Existing platform tooling warns about Facebook Auth Swift Package Manager support
  and plugin Kotlin migration. No dependency or platform-configuration upgrade was
  made to suppress these warnings.

See [ADR 0003](../decisions/0003-station-subscriptions-and-alerts.md) for lifecycle,
retention and compatibility contracts. Resume from the
[acceptance audit](flutter-app-acceptance-audit.md), not a historical checkpoint.


## File inventory

<details>
<summary>Changed and added files</summary>

- `docs/README.md`
- `docs/contracts/account-comments-notifications-contract.md`
- `docs/contracts/architecture-contract.md`
- `docs/contracts/firebase-data-contract.md`
- `docs/contracts/playback-contract.md`
- `docs/contracts/product-ux-contract.md`
- `docs/contracts/security-privacy-contract.md`
- `docs/contracts/station-content-contract.md`
- `docs/decisions/0003-station-subscriptions-and-alerts.md`
- `docs/roadmap/flutter-app-acceptance-audit.md`
- `docs/roadmap/flutter-app-development-plan.md`
- `docs/roadmap/flutter-subscriptions-handoff.md`
- `firebase_tests/firebase-emulators/account-deletion.test.js`
- `firebase_tests/firebase-emulators/station-subscriptions.test.js`
- `firestore.indexes.json`
- `functions/index.js`
- `functions/lib/episode-alerts.js`
- `functions/lib/station-subscriptions.js`
- `functions/package.json`
- `functions/test/station-subscriptions.test.js`
- `lib/app/providers.dart`
- `lib/core/services/share_service.dart`
- `lib/features/account/data/datasources/account_auth_data_source.dart`
- `lib/features/account/presentation/account_screen.dart`
- `lib/features/favorites/presentation/controllers/favorites_controller.dart`
- `lib/features/home/data/repositories/firebase_banners_repository.dart`
- `lib/features/home/data/repositories/home_preferences_repository.dart`
- `lib/features/home/domain/repositories/home_preferences_repository.dart`
- `lib/features/home/presentation/controllers/home_controller.dart`
- `lib/features/home/presentation/home_screen.dart`
- `lib/features/home/presentation/widgets/home_view.dart`
- `lib/features/home/presentation/widgets/visible_banners.dart`
- `lib/features/notifications/data/repositories/firebase_notifications_repository.dart`
- `lib/features/notifications/domain/models/app_notification.dart`
- `lib/features/notifications/domain/models/episode_alert_target.dart`
- `lib/features/notifications/presentation/controllers/notifications_controller.dart`
- `lib/features/notifications/presentation/episode_alert_navigation.dart`
- `lib/features/notifications/presentation/notifications_screen.dart`
- `lib/features/player/data/datasources/just_audio_player_data_source.dart`
- `lib/features/player/domain/models/audio_playback_item.dart`
- `lib/features/player/presentation/controllers/station_player_controller.dart`
- `lib/features/station_content/presentation/controllers/station_content_controller.dart`
- `lib/features/station_content/presentation/program_details_screen.dart`
- `lib/features/station_details/presentation/station_details_screen.dart`
- `lib/features/subscriptions/data/firebase_station_subscriptions_repository.dart`
- `lib/features/subscriptions/data/station_alert_device_data_source.dart`
- `lib/features/subscriptions/data/station_subscriptions_data_source.dart`
- `lib/features/subscriptions/domain/station_subscription.dart`
- `lib/features/subscriptions/presentation/my_stations_screen.dart`
- `lib/features/subscriptions/presentation/station_follow_controls.dart`
- `lib/features/subscriptions/presentation/station_subscriptions_controller.dart`
- `lib/l10n/app_ar.arb`
- `lib/l10n/app_en.arb`
- `lib/l10n/generated/app_localizations.dart`
- `lib/l10n/generated/app_localizations_ar.dart`
- `lib/l10n/generated/app_localizations_en.dart`
- `package.json`
- `test/admin_content_contract_test.dart`
- `test/core/services/share_service_test.dart`
- `test/features/account/presentation/account_screen_test.dart`
- `test/features/account/presentation/edit_profile_bottom_sheet_test.dart`
- `test/features/favorites/presentation/favorites_controller_test.dart`
- `test/features/home/presentation/home_controller_test.dart`
- `test/features/home/presentation/visible_banners_test.dart`
- `test/features/notifications/domain/episode_alert_target_test.dart`
- `test/features/notifications/presentation/notifications_controller_test.dart`
- `test/features/player/presentation/station_player_controller_test.dart`
- `test/features/subscriptions/station_alert_device_data_source_test.dart`
- `test/features/subscriptions/station_follow_controls_test.dart`
- `test/features/subscriptions/station_subscriptions_controller_test.dart`

</details>
