# v3.2.0 validation — 2026-10-19

Scope: source integration from `hudhud_fm` into `main`, version `3.2.0+37`.
Baseline: `9ae5962`; previous main: `c4023ff` (167 commits behind before release preparation).
Environment: macOS, Flutter 3.47.5, Dart 3.13.4, Node v22.23.3.

| Check | Result |
| --- | --- |
| `./tool/verify-governance.sh` | Passed |
| `dart format --output=none --set-exit-if-changed lib test` | Passed; 200 files, no remaining formatting changes |
| `flutter analyze` | One informational deprecation (`TickerMode.of`, now_playing_sheet.dart:49); command exits nonzero |
| `flutter test` | 257 passed |
| `flutter build apk --debug` | Passed |
| `flutter build ios --simulator --debug` | Passed; Xcode build completed in 248.8s |
| Functions `npm run lint` / `npm test` | Passed / 70 passed (including RSS failure/retry regressions) |
| Admin `npm run lint` / `npm test` | Passed / 62 passed, 7 emulator-dependent tests skipped |
| Admin `VITE_FIRESTORE_ROOT=HudHudDev npm run build` | Passed; large-chunk warning |
| Public web `npm run lint` / `npm test` | Passed / 45 passed |
| Public web `VITE_FIRESTORE_ROOT=HudHudDev npm run build` | Passed, including TypeScript check and SSR build |
| `npm run emulators:test` | 26 passed |
| `npm run emulators:account-deletion` | 3 passed |
| `npm run emulators:admin` | 7 passed, no skips |
| `npm run emulators:profile-images` | 3 passed |

## Limitations and follow-up

- Replace deprecated `TickerMode.of` in a focused player-maintenance change; no lint suppression was added.
- Consider web bundle splitting and upstream Kotlin-plugin compatibility updates separately.
- All emulator checks used demo projects. Unit RSS tests use mocks; concurrent ingestion and lost commit acknowledgments are not proven exactly-once.
- No physical-device playback session, signed store build, rollout, deployment, old-data migration or backfill was performed. This source release is not certification of store/production readiness.
- Local admin dependencies were restored because `xlsx` was missing; package manifests and lockfiles were not changed for this restoration.
- Merge is fast-forward: original history remains intact. If rollback is necessary, use reviewed revert commits rather than rewriting shared history; no production rollback is required because nothing was deployed.

- iOS build generated CocoaPods/Xcode metadata and Swift package resolutions locally. These build-generated changes were backed up outside the repository and excluded from this release. The Facebook plugin also warns about future Swift Package Manager compatibility.
