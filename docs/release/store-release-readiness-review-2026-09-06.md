# HudHud FM — store release readiness review and execution plan

Date: 2026-09-06  
Reviewed baseline: `3e8f6cd`, plus the existing local dependency state  
Decision: **NO-GO for live release on Google Play and Apple App Store.**

Execution tracker: [release execution plan and agent assignments](store-release-execution-plan.md). Use that file for current task status; this review preserves the dated baseline evidence.

This is a review of the current plan against source code and local verification, not a release approval. The app has substantial implementation, but production data routing, account safety, signing, iOS configuration, and release evidence remain incomplete. Passing unit tests alone would not close these gaps.

Scope: the independent `hudhud_fm` Flutter application, Functions, Firestore Rules, admin website, and release documents. No production deployment, store upload, live account deletion, or secret inspection was performed. The pre-existing modified `pubspec.lock` and untracked iOS Swift package workspace directory were left in place. Findings describe this working tree; historical claims are not treated as current live evidence.

## 1. Review of the existing plan

The [development roadmap](../roadmap/development-proposals.md) correctly places UGC, account deletion, authentication, and production readiness ahead of expansion. For this launch, make its P0-C release path the active critical path and defer additional subscriptions, personalized notifications, recommendations, and deep-link expansion.

| Plan issue | Required correction |
|---|---|
| Roadmap says there is no Flutter favorites repository/controller/UI. | Reconcile ENG-01..04 with `lib/features/favorites/`, home integration, and existing tests. Implementation exists; certify its behavior rather than rebuilding it. |
| AUTH and UGC are described as locally complete. | Reopen the items affected by findings R01–R04 and R07 below. Separate implemented, locally verified, deployed, and device-verified states. |
| Development/read-only governance coexists with production defaults and personal writes. | Record the approved environment model in the owning contracts. Do not infer authorization to deploy from source code. |
| Production is described as a separate environment, but implementation mainly changes a Firestore root. | Specify Firebase project/Auth/Functions/FCM/admin separation as well as the root. Two Firestore roots in one project do not isolate Firebase Auth users. |
| Contract requires Storage Rules, but `storage.rules` and a Storage deployment section are absent. | Resolve photo scope first: defer uploads explicitly, or design authorized Storage access, deletion, and tests. Do not add permissive rules merely to satisfy a checklist. |
| Quality gates emphasize debug builds. | Add signed release AAB/archive validation and real-device tests on the exact release candidate. |
| Contract prescribes 5% rollout for both stores and reuse of the previous artifact as rollback. | Adopt the platform-specific rollout and recovery process in section 7. These contract changes require an explicit decision, not silent reinterpretation. |

The [release contract](../contracts/release-readiness-contract.md) is missing from the binding-contract list in `docs/README.md`, and `tool/verify-governance.sh` does not require its presence. Add it to both when reconciling governance. The contract's official-logo source is also an absolute path on another workstation; record portable asset provenance and acceptance evidence.

## 2. Confirmed implementation blockers

P0 means a data/authentication/production-safety blocker. P1 means an issue that must be resolved before the affected platform or feature ships. Owners are proposed roles; named assignees and dates remain to be assigned.

### R01 — P0: Account deletion crosses environments and leaves production data behind

Evidence: [`functions/index.js`](../../functions/index.js), `deleteAccount` and `reconcileCommentCounts` (around lines 516–600); [`account_auth_data_source.dart`](../../lib/features/account/data/datasources/account_auth_data_source.dart), `deleteAccount` (around line 263).

The release client defaults to `HudHudOfficial`, but deletion selects the `HudHudDev` user and job documents and only reconciles Development episode counters. It queries comments, reports, and blocks through unscoped collection-group queries, then deletes the Firebase Auth user. This can remove records across roots while leaving the Official profile and personal subcollections orphaned. The client sends no environment argument.

**Close when:** an approved server-side environment model consistently scopes deletion, jobs, related records, counters, and Auth lifecycle. Emulator tests cover Official data, both roots with the same UID/episode IDs, partial failure, retry, and successful full cleanup. If Auth is shared, explicitly decide whether account deletion covers both environments; do not accidentally combine root-local cleanup with project-wide identity deletion. Owner: Firebase/data.

### R02 — P0: Production client, email backend, and moderation website disagree on the root

Evidence: [`firestore_paths.dart`](../../lib/core/config/firestore_paths.dart), lines 9–15; [`functions/index.js`](../../functions/index.js), verification path helpers and `verifyEmailCode`; [`admin-resources.ts`](../../admin_web/lib/admin-resources.ts), line 27; [`admin-app.tsx`](../../admin_web/components/admin/admin-app.tsx), moderation and station operations.

Release defaults to Official, but email challenges/rate limits and the profile created by successful email verification default to Development. Admin resource paths and multiple mutations are hard-coded to Development. Consequently, the current admin cannot be assumed to moderate Official comments. Additionally, `FIRESTORE_ROOT` can override a release build to Development or another value without a release guard.

**Close when:** client, backend, admin, Rules, indexes, and notification environment agree; production release rejects Development/unknown roots; deployment configuration explicitly selects the approved Firebase environment. Run registration → verification → Official profile → comment → report → admin removal end to end. Parameterize Rules/integration tests over both allowed roots and add isolation cases; existing test fixtures primarily target Development. Owner: delivery + Firebase + Flutter + admin.

### R03 — P0: Social provider identity is treated as proof of verified email

Evidence: [`firestore.rules`](../../firestore.rules), `isVerifiedUser` (around line 22); [`functions/index.js`](../../functions/index.js), `ensureAccountProfile` (around line 267); [`account_auth_data_source.dart`](../../lib/features/account/data/datasources/account_auth_data_source.dart), `watchAccount` and `_ensureAccountProfile`.

Rules allow Google/Apple/Facebook provider tokens without `email_verified`. The backend sets `emailVerified: true` when it finds one of these linked providers, without separately proving ownership of the current email. The client also projects social users as verified. This conflicts with the explicit contract requiring unverified/missing-email social accounts to complete verification before personal writes.

**Close when:** verification follows the trusted email claim/approved verification flow, including linked-provider and missing-email cases. Add negative tests for unverified Facebook and linked social accounts in Rules and backend, plus UI tests that reflect the same state. Do not close this merely by changing the label in Flutter. Owner: Firebase/authentication.

### R04 — P0: OTP verification does not enforce challenge state before matching

Evidence: [`functions/index.js`](../../functions/index.js), `verifyEmailCode` transaction (around lines 193–243).

The transaction checks existence and expiration but does not reject `locked`/`consumed` challenges or zero remaining attempts before comparing the code. Incorrect submissions continue to reach comparison after the attempt budget is exhausted, and a matching code can still be accepted. Marking a challenge consumed also does not itself prevent another concurrent verification before the later document deletion. This is a source-confirmed control gap; no live attack was attempted.

**Close when:** only an active, unexpired challenge with remaining attempts can be consumed atomically. Test correct code after lockout, additional wrong attempts after lockout, concurrent successful requests, and retry after downstream Auth failure. Preserve recoverability without making codes reusable. Owner: Firebase/authentication.

### R05 — P0: Android release silently falls back to debug signing

Evidence: [`android/app/build.gradle.kts`](../../android/app/build.gradle.kts), `signingConfigs.release`.

When key alias/store file settings are absent, the release config calls `initWith(signingConfigs.getByName("debug"))`. This violates the release contract even though production signing support exists. R8 and resource shrinking are enabled, but that does not establish artifact identity.

**Close when:** missing/incomplete production signing fails the release build; normal debug development remains supported. Verify the final AAB certificate against the existing Play app's upload/signing setup through approved secret handling. Confirm versionCode exceeds any previously uploaded build; `1.0.0+1` in `pubspec.yaml` is not proof of an acceptable store version. Owner: Android/release.

### R06 — P1: iOS entitlements and store destination are incomplete

Evidence: [`Runner.entitlements`](../../ios/Runner/Runner.entitlements) is an empty dictionary and is referenced by the Xcode project; [`store_url_helper.dart`](../../lib/core/utils/store_url_helper.dart), iOS branch; [`app_rating_dialog.dart`](../../lib/features/account/presentation/widgets/app_rating_dialog.dart), default helper call.

The source entitlement file contains neither Sign in with Apple nor APNs entitlements, although the app exposes Apple login and notification functionality. Signed provisioning/archive evidence is absent from this review. The default iOS rating URL is built from the bundle identifier instead of the numeric App Store ID. Its unit test currently expects this fallback rather than validating a real listing.

**Close when:** capabilities, provisioning, Apple provider and APNs setup are verified on a physical iPhone using the distribution candidate; the approved numeric App Store ID is configured and opened from the app. Update the URL test accordingly. Owner: iOS/release.

### R07 — P1: External account deletion excludes accounts without a password

Evidence: [`account-deletion-page.tsx`](../../admin_web/components/account/account-deletion-page.tsx), `submit` and required password input.

The public page only uses `signInWithEmailAndPassword`. Google/Apple/Facebook-only users without a password cannot complete this route. In-app provider reauthentication does not fix the external route for someone who removed the app. Its failure message also promises that the account was not deleted even though the backend operation can partially complete.

**Close when:** a secure, discoverable external deletion request works for every shipped account type, including Apple private relay, and partial-failure messages accurately support retry. Capture both in-app and external evidence with disposable test users after R01 is fixed. Owner: admin + Firebase.

### R08 — P1: Sharing exposes source audio URLs instead of approved content links

Evidence: [`share_service.dart`](../../lib/core/services/share_service.dart), `shareStation` and `shareEpisode`.

The share text contains `station.streamUrl` or `episode.audioUrl`. The roadmap explicitly requires canonical content links instead of raw streams. This is already implemented behavior, so deferring new deep links alone does not remove the issue.

**Close when:** existing sharing uses an approved public content/store destination, or the affected share action is explicitly deferred. Add tests asserting that source audio URLs never enter share payloads. Owner: Flutter/product.

### R09 — P1: Profile photo selection has no durable upload path

Evidence: [`edit_profile_bottom_sheet.dart`](../../lib/features/account/presentation/widgets/edit_profile_bottom_sheet.dart), `_pickImage` and `_save`; [`account_auth_data_source.dart`](../../lib/features/account/data/datasources/account_auth_data_source.dart), `updateProfile`.

The picker passes the local `picked.path` into profile persistence as `photoUrl`/`avatarUrl`. This is a device-local path, not an HTTPS image accessible after reinstall or on another device. No Storage upload path is present in this flow. The picker catch also prints the raw exception.

**Close when:** decide whether launch supports uploads or approved bundled avatars only. For uploads, implement validated durable storage, owner access, cleanup/deletion, and safe errors; for bundled avatars, persist a defined asset identifier without pretending it is a remote URL. Test restart and a second-device profile read. Owner: Flutter + Firebase/product.

### R10 — P1: Crash reporting is partially integrated, not release-verified

Evidence: [`firebase_bootstrap.dart`](../../lib/app/firebase_bootstrap.dart) installs Flutter/platform error handlers; `firebase_crashlytics` is in [`pubspec.yaml`](../../pubspec.yaml). No playback breadcrumb calls were found in the player source. Android Gradle does not declare the Crashlytics plugin; no Crashlytics symbol-upload phase was found in the app Xcode project.

**Close when:** finish the supported native build/symbol-upload integration and safe playback breadcrumbs; prove a controlled crash from each release candidate arrives with useful symbols and no user data or stream URLs. Also verify errors occurring before Firebase bootstrap and collection behavior for development versus production. Dependency presence alone is not observability evidence. Owner: release + playback.

### R11 — P1: Local quality gates are not all green

The formatting check flags 61 of 140 files. Flutter tests finish with 108 passed and 1 failed: `can open UGC guidelines from Settings Hub`, at `test/features/account/presentation/account_screen_test.dart:104`. The expected dialog text is absent; the log also contains a missed-hit-test warning. Investigate visibility/scrolling and the actual interaction before classifying this as an app defect versus a test defect; do not remove the assertion to obtain a green run.

Admin lint reports an unused `Bell` import and two `next/no-html-link-for-pages` errors in the public legal pages. This website is Vite/React; align lint configuration with its actual router rather than adding Next.js solely to satisfy those diagnostics. See section 4 for independent test/build results.

The Android debug build also fails in `:flutter_facebook_auth:compileDebugKotlin`: its Java compilation targets JVM 11 while Kotlin targets JVM 17. The application module's Java/Kotlin 17 configuration does not by itself align the plugin module. Investigate the pinned plugin (`flutter_facebook_auth: 7.1.6`) and the current Flutter/Gradle toolchain; resolve compatibility through a supported configuration/version rather than suppressing target validation. The build additionally warns about plugin Kotlin Gradle Plugin usage and the future Swift Package Manager compatibility requirement.

**Close when:** formatting, applicable lint, tests, and Android debug/release builds pass on a frozen candidate with compatible plugin toolchains. Make formatting cleanup reviewable and avoid combining unrelated functional rewrites. Owner: Flutter/Android/admin quality.

## 3. Implemented foundations and evidence limits

| Area | Evidence in the repository | Remaining proof |
|---|---|---|
| Core product | Discovery, station/program/episode views, shared player, account and comments flows; station favorites and tests exist. | Device journeys, offline/retry, account switching, RTL and accessibility on the candidate. |
| UGC | Agreement, reports, personal blocking, moderation UI, Rules and runbook exist. | Official-root moderation, operational staffing, published policies, actual review evidence. |
| Legal pages | `/privacy`, `/terms`, `/community-guidelines`, `/account-deletion` routes exist in `admin_web/main.tsx`; mobile URLs derive from `APP_DOMAIN`. | Approved public domain, correct rendered content and functioning actions in a private browser. `String.fromEnvironment` is build-time configuration, not runtime Remote Config. |
| Branding | Launcher configuration, Android adaptive/monochrome resources and iOS 1024 icon asset exist; Android manifest selects `launcher_icon`. | Visual identity/provenance, monochrome silhouette, safe zones, opacity, and final artifact inspection. Generated files alone do not prove approval. |
| Android optimization | Minification/shrinking and audio keep rules exist. | R8 release build, playback regression testing, actionable mapping files; justify broad `dontwarn` rules. |
| Configuration hygiene | Firebase/auth/signing files are ignored. | Secure release provisioning and certificate checks, without committing or printing secrets. Ignore rules do not prove credentials are valid. |

## 4. Verification performed for this review

Environment: local macOS; Flutter **3.44.0**, Dart **3.12.0**, Xcode **26.2** (17C52), Node **26.6.0**. Node is outside the root project's declared `>=20 <25` range and differs from Functions' Node 22 runtime; repeat JS gates under supported Node 22 before certification.

| Command / check | Environment | Result |
|---|---|---|
| `git status --short` | `hudhud_fm` | Existing lockfile modification and untracked Swift package workspace recorded; no clean candidate baseline claimed. |
| `./tool/verify-governance.sh` | Local shell | PASS; checks document presence/basic conventions, not production readiness. |
| `dart format --output=none --set-exit-if-changed lib test` | Local Dart | FAIL, exit 1: 61 files need formatting out of 140. `--output=none` did not rewrite them. Initial sandbox cache failure was retried with permission. |
| `flutter analyze` | Local Flutter | PASS, no analyzer issues. Tool warns `flutter_facebook_auth` lacks Swift Package Manager support. Initial SDK-cache sandbox failure was retried with permission. |
| `flutter test` | Local Flutter | FAIL, exit 1: 108 passed, 1 failed (`can open UGC guidelines from Settings Hub`, line 104). |
| `npm run lint && npm test` | `functions`, Node 26 | PASS: syntax checks and 7 tests. These helper tests do not establish complete callable-flow behavior. |
| `npm run lint` | `admin_web`, Node 26 | FAIL: 3 errors in the privacy/terms pages. |
| `npm run build` | `admin_web`, Node 26 | PASS, run separately after lint failed. Warnings: deprecated Node API and a 911.46 kB JS chunk (276.04 kB gzip). |
| `npm run emulators:test` | Local demo Firebase project | PASS: 20 tests in 5 suites, exit 0 after retry outside sandbox. Initial startup failed with a port/cache access error. Current fixtures do not establish Official-root isolation. |
| `flutter build apk --debug` | Local Android toolchain | FAIL, exit 1 after approximately 177 seconds: `:flutter_facebook_auth:compileDebugKotlin`, Java JVM target 11 versus Kotlin 17. No successful debug artifact produced by this run. |
| `npm run emulators:account-deletion` | Auth/Firestore/Functions emulators | NOT RUN in this review; historical success is not current evidence. Required after root/deletion fixes. |
| `npm run emulators:email-verification` | Auth/Firestore/Functions emulators | NOT RUN in this review; required after verification fixes, with the missing negative/concurrency cases. |
| iOS simulator build; signed AAB/IPA/archive | Platform build tools | NOT RUN in this review. No platform files changed; production configuration/signing blockers remain. |
| Production configuration, policy pages, OAuth, Crashlytics console and store dashboards | Live services | NOT VERIFIED; repository review does not establish current deployment or store state. |

### Device and playback matrix

| Target | Install/start | Audio >30 minutes, locked/background | Calls, Bluetooth/headset, focus | Auth/UGC/deletion/FCM | RTL, 200% text, small/large screens |
|---|---|---|---|---|---|
| Android physical device, supported older OS | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| Android physical device, current OS | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| iPhone physical device, supported older iOS | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| iPhone physical device, current iOS | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN |

Use signed release candidates. Include Wi-Fi/mobile switching, lost network/retry, primary/backup streams, live radio versus episode seeking, remote play/pause/stop, permission denial, user-paused audio during interruptions, battery restrictions, and process death behavior defined by the [playback contract](../contracts/playback-contract.md). Add iPad testing if tablet support remains in the submitted app.

## 5. Store requirements to add to the launch checklist

Official policy sources were checked on 2026-09-06; confirm applicable console requirements again at submission.

- **Android target API:** new phone apps/updates must target API 36 or higher from August 31, 2026. This checkout inherits target SDK 36 from the installed Flutter Gradle extension, but inspect the final AAB/merged manifest rather than relying on an SDK default. [Android target API requirements](https://developer.android.com/google/play/requirements/target-sdk).
- **Android native libraries:** validate the final Flutter/plugin binaries for 16 KB page-size support and run on a compatible environment. An NDK version declaration alone is insufficient. [Android 16 KB compatibility](https://developer.android.com/guide/practices/page-sizes).
- **Apple SDK:** iOS uploads require the iOS 26 SDK or later from April 28, 2026. Xcode 26.2 is installed; verify the archive actually uses an accepted SDK. [Apple SDK minimum requirements](https://developer.apple.com/news/?id=ueeok6yw).
- **Accounts and UGC:** complete report/block/moderation evidence, prohibited-content terms, and functional account deletion inside and outside the app as applicable. Include every shipped provider in deletion testing. [Google UGC](https://support.google.com/googleplay/android-developer/answer/9876937?hl=en), [Google account deletion](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en), [Apple deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/).
- **Apple review:** validate the equivalent privacy-preserving login requirement or document an applicable exception; also review UGC filtering/reporting/blocking and support contact requirements. [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).
- **Submission evidence:** owner must complete current Data safety/App Privacy disclosures, age/content ratings, privacy manifests/required-reason API and SDK checks, encryption/export questions, foreground service and notification declarations where requested, screenshots, descriptions, support contact, review access/instructions, and content/stream/logo distribution rights. These forms and rights were not inspected here. Inventory actual SDK behavior, including Facebook and Crashlytics, before answering privacy questions.
- **Account eligibility:** confirm Play/App Store account verification, agreements, territories, app ownership, existing listing IDs and current build numbers. If this is a new app/account, check applicable testing/production-access gates in its console. Do not assume first release versus update from the source version.

## 6. Proposed execution plan

| Order | Work package | Owner | Depends on | Exit evidence |
|---|---|---|---|---|
| 1 | Freeze launch scope; reconcile contracts and roadmap; assign named owners and due dates. | Delivery/product | None | Approved candidate scope, environment decision, platform/listing status. |
| 2 | Fix R01–R04: environment routing, complete deletion, trusted verification and OTP state enforcement. | Firebase + Flutter/admin | 1 | Dual-root/isolation, provider-negative, deletion-retry and OTP-concurrency tests passing on supported runtime. |
| 3 | Fix R05–R10: signing guard, iOS setup/store ID, external deletion, sharing, photo scope, crash reporting. | Platform + admin + playback | 1; integrate with 2 | Release configuration guards and targeted tests; reviewable code/config without secrets. |
| 4 | Close R11 and rerun all applicable quality gates. | Quality | 2–3 | Green governance/format/analyze/tests, Functions/admin lint/build and all three emulator suites. |
| 5 | Prepare approved backend/rules/indexes/admin deployment and legal content as one compatible release. | Firebase/admin + release | 4 | Deployment manifest, tested ordering, compatibility/migration checks and rollback package. Production writes require their own authorized execution. |
| 6 | Build signed AAB and iOS archive; inspect IDs, roots, domains, versions, entitlements, target SDK, symbols and signing. | Release | 5 | Immutable artifacts with checksums, commit/lockfiles, tool versions and sanitized build manifest. |
| 7 | Run physical-device matrix and capture store review evidence. | Quality + moderation | 6 | Dated recordings/results against artifact hashes; working email/providers/deletion and visible symbolicated crashes. |
| 8 | Complete console metadata, beta/internal testing and final release sign-off. | Store owner + quality | 7 | No unresolved P0/P1; all mandatory gates PASS; owners accept residual non-blocking risks. |
| 9 | Release using the applicable store strategy and monitor. | Release + on-call | 8 | Approved rollout, incident owner and recorded health decision before expansion. |

Do not estimate a launch date from repository completeness alone. The schedule depends on external credentials/provider setup, content/legal approval, physical-device evidence and store review. Keep each blocker open until its exit evidence is attached.

## 7. Rollout and recovery corrections

**Google Play:** the proposed 5% → observe ≥24 hours → expand sequence is usable for an eligible update. Staged rollout is not available for an app's first publication; use the appropriate testing track and an explicit first-launch decision. [Google staged rollouts](https://support.google.com/googleplay/android-developer/answer/6346149?hl=en).

**Apple:** phased release applies to updates and uses the seven-day 1%, 2%, 5%, 10%, 20%, 50%, 100% sequence for automatic updates. Anyone can still manually download the update. First launch needs its own beta/manual release decision. [Apple phased releases](https://developer.apple.com/help/app-store-connect/update-your-app/release-a-version-update-in-phases).

Retain the contract's crash-free users ≥99.5% gate, but record sample size and a meaningful observation period; an empty or tiny sample is not proof. Also monitor ANRs, startup failures, playback failures, account verification/deletion, moderation backlog and backend errors. Halt expansion for a critical data/authentication issue regardless of crash-free percentage.

Retain previous source, dependencies, symbols and compatible backend/rules artifacts. Halting rollout does not downgrade already-updated devices. Prepare a forward-fix build with an acceptable higher version/build number and review process; do not promise instant re-upload of the old binary. Apple explicitly does not permit reverting the store to a previous app version. [Apple version recovery constraints](https://developer.apple.com/help/app-store-connect/update-your-app/create-a-new-version).

For backend incidents, restore only a tested compatible Rules/Functions version with migration awareness; never temporarily open database access. Account deletion is irreversible, so pause an unsafe deletion path and resolve its implementation rather than describing data restoration as an app rollback.

## 8. Final acceptance record

- [ ] R01–R11 resolved with linked evidence and named owners.
- [ ] All applicable automated gates pass under supported toolchains.
- [ ] Signed release artifacts and immutable build manifest retained.
- [ ] Official environment and complete account lifecycle verified.
- [ ] Physical-device playback, authentication, UGC, deletion, notifications and accessibility matrix passes.
- [ ] Public legal/support/store links and official branding approved.
- [ ] Store declarations, rights, review access and platform eligibility complete.
- [ ] Crash reporting, operational moderation and incident ownership verified.
- [ ] Platform-specific rollout/recovery decision accepted by the release owner.

**Current acceptance: FAIL / NO-GO.** This report is the actionable release backlog; it does not certify the app as ready for public distribution.
