# November2026 local acceptance record

Updated UTC: 2026-10-24T17:50:25.350599+00:00

Baseline HEAD: `13d4f9d2114dabb38cdcc2c96c98e226275ca0be` on `hudhud_fm`. Changes are **uncommitted**.
Changed-source SHA-256: `51eca3b7e1a1c34531c9fcf1c8a47cf703739599a5abeeb1619fa1783258a30a` (101 changed/new non-Markdown files; includes paths, per-file hashes and HEAD).
This fingerprint distinguishes the tested working tree from HEAD; it is not a commit or release signature.

## Verified checks

| Check | Result | Log |
|---|---|---|
| Flutter full suite |301 passed|/tmp/hudhud-nov-a11y-full.log|
| Flutter analyzer |No issues|/tmp/hudhud-nov-a11y-analyze.log|
| Dart format |209 files,0 changed|/tmp/hudhud-nov-a11y-format-check.log|
| Governance / diff whitespace |Passed|/tmp/hudhud-nov-a11y-governance.log; git diff --check|
| Functions unit / syntax lint |147 passed / passed|/tmp/hudhud-region-functions.log; /tmp/hudhud-nov-final-functions-lint.log|
| Editorial native emulator |37 passed|/tmp/hudhud-region-native-final.log|
| Firestore Rules |33 passed|/tmp/hudhud-nov-final-rules.log|
| Admin real Auth/Functions |14 passed,0 skipped|/tmp/hudhud-nov-final-admin-emulator.log|
| Admin unit |74 passed;14 emulator-only skips (covered above)|/tmp/hudhud-nov-final-admin-test.log|
| Public unit |53 passed|/tmp/hudhud-nov-final-public-test.log|
| Public/Admin typecheck, lint, Development build |Passed|/tmp/hudhud-nov-final-{public,admin}-{typecheck,lint,build}.log|
| Maintenance unit |24 passed|/tmp/hudhud-nov-final-maintenance.log|
| Android debug APK |Built|/tmp/hudhud-nov-a11y-apk.log|
| iOS debug simulator |Built|/tmp/hudhud-nov-a11y-ios.log|
| Profile images emulator |3 passed|/tmp/hudhud-nov-final-profile-images.log|

Node22.23.4, Flutter3.47.5/Dart3.13.4; all emulator projects are demo targets. No live data or real FCM was used.

## Build artifacts

| Artifact | SHA-256 | Bytes |
|---|---|---|
|`build/app/outputs/flutter-apk/app-debug.apk`|`e190b274750d4f10d4cad32e93108e09c3f8bdfd2c35acff5854f0aa934b87fd`|206429718|
|`build/ios/iphonesimulator/Runner.app/Runner`|`8997808bf8e4673ebd8ad893025628d1973ac0360d5d7df1989e85a5e2cabfb6`|123440|

The Runner row hashes only the executable. The **complete iOS bundle** is covered by a sorted relative-file SHA-256/symlink manifest: `/tmp/hudhud-nov-ios-bundle-manifest.json`, SHA-256 `d71e76737eae2bebf7aeb055428d14a1a561a79b7e8a3c669ccdc936916cfb75`, 427 entries, 266671146 file bytes. Neither artifact is signed for store release or uploaded.

## Browser and device matrix

| Scenario | Evidence / remaining gate |
|---|---|
| Working-stream discovery | Synthetic desktop/mobile fixture; filter composition, empty recovery, archive navigation; previous screenshots /tmp/hudhud-working-*.png. |
| Regional catalog | ARAB/global-ar remains visible; selecting عربي gives1 station and valid regional metadata.390×844 has no horizontal overflow. /tmp/hudhud-regional-{desktop,mobile}.png. |
| Episode controls | Native/model/controller/widget regressions: paused replay, unknown/live, clamps, seek rejection, replacement queue, timer cancellation, AR/EN200-percent and late completion after unmount. |
| Physical Android/iOS audio | Not exercised: available targets were iOS simulator, macOS and browser; no physical phone. Background/foreground, calls, Bluetooth/headset, network change and >30-minute audio remain required. |
| Real FCM | Not exercised; provider/device receipt, permission, opt-out and background delivery remain physical-device/rollout gates. |
| Live catalog preview | Not run. Owner must validate22-entry legacy coverage list, especially Mukalla/Seiyun, Hadramawt and Sanaa/Amanat. |

Browser tests used only localhost synthetic data. One development HMR createRoot warning was observed while editing the fixture; reloading without its state parameter selects the default fixture, not production data. Browser viewport was reset. No local fixture result proves network audio delivery.

## Release decision and recovery

**Not approved for production release.** Local automated/build checks listed above pass; owner geography validation and physical audio/FCM gates remain open. NOV-07 and NOV-11 are not fully complete. NOV-10 source acceptance does not close its physical-device gate.

Roll out compatible backend/client changes before enabling new schema/Rules. Stop the old scheduler before switching notification delivery leases, as recorded in the execution ledger. Keep unknown sends explicit; do not force retries. Identity and regional migrations require explicit target/reviewed manifests/backups. Use their documented run-owned restore paths; never reset shared history or overwrite later editorial changes.

Generated iOS Podfile.lock/project/SwiftPM files are preserved. SPM already existed; the build removed stale Pods resources and regenerated resolution files without changing Firebase12.18.0. Review the recorded before/after backup in WORK_PROGRESS. Known future warnings: Kotlin plugin Built-in Kotlin adoption, Facebook SwiftPM adoption, and web chunk size. No dependency upgrade was introduced to silence them.

No Commit, Reset, push, deployment, production/store signing, production migration or external message was performed after the latest user restriction.

Next action: obtain owner catalog validation and complete the physical-device acceptance matrix when a test phone is available. Keep WORK_PROGRESS current; do not repeat completed local implementation.


## Accessibility follow-up and artifact retention

A real semantic-action test initially found the progress label on a different
node from its elapsed/total value (expected `0:12 / 1:00`, actual empty value on
the named node). MergeSemantics now keeps label/time/adjustment actions together.
AR/EN200-percent tests perform actual semantic increase/decrease and Tab/arrowUp;
2/2 focused and301/301 full Flutter pass after the fix, analyzer clean. The RED
trace was observed in tool output; its raw log was overwritten by the GREEN run.
The excerpt above preserves that limitation rather than inventing a retained log.
Both platform artifacts above were rebuilt after this source change.

Previous APK/whole iOS bundle and manifests are retained under
`/tmp/hudhud-november-artifacts/pre-accessibility-fix/`; candidate copies and
source metadata are under `/tmp/hudhud-november-artifacts/accessibility-verified/`.
These are local temporary archives, not uploaded durable release storage. The
previous files already include NOV-10, so they are not the original player-work
latency baseline. That comparison remains in the physical-device worksheet.

Detailed remaining work: [completion audit](november-2026-completion-audit.md),
[device worksheet](november-2026-device-acceptance.md), and
[owner catalog review](../operations/location-catalog-owner-review.md).
