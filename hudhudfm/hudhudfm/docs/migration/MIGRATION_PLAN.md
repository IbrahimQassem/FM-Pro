# Migration Plan

## Phase 0: Current Baseline

Status: started.

- Replace Flutter counter app with Hudhud FM shell.
- Add domain models for radios, programs, episodes, schedules, Remote Config,
  and playback state.
- Add migration charter, Firebase contract, and sub-agent role prompts.
- Keep data in memory until Firebase packages and config are installed.

## Phase 1: Firebase Read Path

Status: partially implemented.

- Added `firebase_core`, `cloud_firestore`, `firebase_auth`, and
  `firebase_remote_config`.
- Added optional Firebase initialization with in-memory fallback when platform
  config is missing.
- Added `AppEnvironment` so Firebase adapters use
  `HUDHUD_FIREBASE_BASE_DOCUMENT` instead of hard-coding a production base
  document at the dependency boundary.
- Added Remote Config bootstrap for the legacy `hudhudFmAppConfig` JSON key.
- Added anonymous session bootstrap through Firebase Auth when Firebase is
  available.
- Added app version repository and force-update gate based on `requiredVersion`.
- Added read-only Firestore repositories for radios, programs, and episodes.
- Replaced program and episode placeholders with repository-backed panes tied
  to the selected radio.
- Added model mapping tests for Firebase paths, Remote Config, radios,
  programs, episodes, force update, and bootstrap ordering.
- Added Firebase emulator rules tests for Firestore content reads/writes,
  profile role escalation prevention, and safe profile updates.
- Added widget coverage for navigating from radios to programs and episodes.

Remaining:

- Add platform Firebase configuration files through FlutterFire CLI or manual
  native config.
- Add Firebase data integration tests against real platform configuration before
  using production data.

## Phase 2: Playback

Status: partially implemented.

- Added `just_audio` and `audio_session`.
- Added `just_audio_background`/`audio_service` integration for background
  playback metadata, media controls, Android foreground service wiring, and iOS
  audio background mode.
- Moved playback behind `PlaybackEngine`.
- Added `JustAudioPlaybackEngine` with audio session configuration.
- Updated `PlayerController` to call the engine and expose loading, playing,
  paused, idle, and failed states.
- Added tests for valid playback with notification metadata, missing stream URL,
  and engine failure.

Remaining:

- Add platform notification permissions and lifecycle QA.
- Add stream/network integration tests on real devices or emulators.

## Phase 3: Auth And Profile

Status: partially implemented.

- Added anonymous session bootstrap through `AuthSessionRepository`.
- Added `FirebaseAuthSessionRepository.signOut()` so logout delegates to
  FirebaseAuth instead of clearing local state only.
- Added account screen with current session state and logout action.
- Added account sign-in provider actions gated by Remote Config flags for
  Google, Facebook, phone, and email. Google, Facebook, and phone currently stop
  at an explicit Firebase setup message until provider credentials are
  configured.
- Added email/password register and sign-in flow through `AuthSessionRepository`
  using FirebaseAuth in production and in-memory sessions for local development.
- Added safe profile editing for legacy user fields: `name`, `email`, `mobile`,
  `photoUrl`, `nickNme`, `bio`, `tag`, `country`, and `city`. Profile writes do
  not include sensitive or authorization fields such as `password`, tokens,
  `userType`, or `allowedPermissions`.
- Added account deletion boundary. Firebase deletion maps
  `requires-recent-login` to a domain exception so UI can request a fresh login
  instead of showing a generic failure.
- Added tests proving logout calls the auth repository and clears local session
  state after repository sign-out. Tests also cover account deletion success,
  recent-login failure handling, email register/sign-in state changes, provider
  visibility from Remote Config, and profile save behavior.

Remaining:

- Implement Google/Facebook/phone Firebase sign-in flows after production
  OAuth/SMS configuration is available.
- Add server-authorized user role loading for admin gates.

## Phase 4: Admin Tools

Status: started.

- Added `AdminRole` mapping for legacy `userType` values: `USER`, `ADMIN`,
  and `SuperADMIN`.
- Added `AdminRoleRepository` with Firestore and in-memory implementations.
- Added admin tab gating in the Flutter shell. The tab is hidden for ordinary
  users and visible for admin roles.
- Added admin UI placeholder that explicitly blocks write actions until
  Firestore rules or backend authorization are in place.
- Added guarded admin content command layer for radio, program, and episode
  save/delete operations.
- Added Firestore and in-memory admin content repositories. Firestore writes use
  stable document ids from `radioId`, `programId`, and `episodeId`.
- Added a guarded episode admin form wired to the command service.
- Added guarded radio and program admin forms wired to the same command service.
- Added delete confirmation before episode deletion.
- Added delete confirmation before radio and program deletion.
- Expanded the episode admin form with a multi-slot broadcast schedule editor
  for `dateStart`, `dateEnd`, `timeStart`, `timeEnd`, and `weekdays`.
- Expanded admin forms to preserve key legacy metadata:
  - Radio: `logo`, `tag`, `enName`, and `createBy`.
  - Program: `prProfile`, `prTag`, and `prCategoryList`.
  - Episode: `epProfile`.
- Added admin status toggles for legacy `disabled` fields on radios, programs,
  and episodes so hidden content can be preserved without appearing in user
  lists.
- Added Firebase Storage media repository boundary with Firebase and in-memory
  implementations. Uploads keep the legacy `{base}_Folder/{parentId}/{fileName}`
  object path and write the returned download URL into radio, program, and
  episode media fields.
- Added reference Firestore and Storage rules plus `firebase.json` emulator
  wiring for auth, Firestore, Storage, and emulator UI.
- Added Firebase emulator rules tests for Storage media upload authorization,
  image-only uploads, ordinary-user denial, and public media reads.
- Added tests for legacy role mapping, admin tab visibility, unauthorized write
  blocking, preserving `episodeId` during edits, admin episode save, and delete
  confirmation. Widget tests now also cover radio/program save paths and
  multiple episode schedule slots with metadata persistence. Storage path and
  in-memory media upload behavior are covered by unit tests. Destructive-action
  confirmation is covered for radio, program, and episode deletion.
  Widget coverage also verifies disabled-state persistence for all three admin
  forms.

Remaining:

- Expand forms to cover remaining legacy counter fields where they are still
  product-relevant.
- Gate all production writes by server-side authorization rules/functions.

## Phase 5: Release Hardening

- Reviewed and tightened platform permission/backup defaults:
  - Android declares only required network/audio/background notification
    permissions.
  - Android disables cleartext traffic by default.
  - Android disables app backup and excludes app data from backup/transfer
    extraction rules.
  - iOS keeps App Transport Security defaults and enables only audio background
    mode.
- Add crash reporting after privacy review.
- Add integration tests for bootstrap, listing, player, auth, and admin flows.
- Run release build and manual RTL/accessibility QA.

## Definition Of Done

- `flutter analyze` passes.
- `flutter test` passes.
- Firebase contract has tests for path generation and mapping.
- Playback runs in foreground/background without UI object references.
- Admin writes are denied when server authorization is absent.
- RTL, empty, loading, and error states are verified on mobile screen sizes.
