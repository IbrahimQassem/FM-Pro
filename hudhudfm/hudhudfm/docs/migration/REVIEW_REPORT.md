# FM-Pro Review Report

## Scope

Reviewed the legacy Android Java `FM-Pro` flow against the new Flutter
`hudhudfm` migration target. The review covered bootstrap, Remote Config, auth,
Firestore access, player behavior, admin flows, UI/UX states, security, and
testability.

## Critical Findings

1. Splash has a Remote Config race.
   `SplashActivity` evaluates update/session flow before the async Remote Config
   fetch is guaranteed to finish. Flutter bootstrap must await config or use a
   clearly defined fallback.

2. Admin authorization is local-state based.
   `BaseActivity` and `BaseFragment` rely on values cached in preferences. This
   can hide or show UI, but it must not authorize Firestore or Storage writes.

3. Logout is incomplete.
   `UserProfileActivity` clears local session data while Firebase sign-out is
   disabled in the legacy code. Flutter logout must sign out from Firebase and
   then clear local cache.

4. Delete account has a null-check defect.
   The legacy code attempts deletion under the wrong null condition. Flutter
   account deletion must require a non-null current user and recent auth.

5. Player service is coupled to UI widgets.
   `RadioPlayerService` stores a `FloatingActionButton` reference. Flutter
   playback must expose state through a controller/service, never widget refs.

6. Episode edit can create a new id.
   `AddEpisodeActivity.send()` generates a new episode id during save. Flutter
   edit flows must preserve ids.

7. Firestore paths are nested and easy to break.
   The helper creates repeated collection/document names. The migration includes
   `FirebasePaths` tests to lock this behavior before adding Firestore code.

8. Platform permissions need release review.
   The legacy manifest includes privileged/old storage permissions, cleartext
   traffic, and broad backup behavior. Flutter platform manifests must be
   tightened before release.

## UI/UX Findings

- Loading, empty, error, and success states are not consistently separated.
- RTL and Arabic are not treated uniformly; some flows force LTR.
- Several actions need clearer feedback and confirmation. Admin deletion now has
  confirmations; upload feedback exists in the Flutter admin forms and still
  needs emulator/security-rule validation.
- Accessibility labels/tooltips are inconsistent around playback controls.
- Long Arabic labels and radio metadata need truncation rules to avoid clipping.

## Technical Debt

- Firebase access is mixed into activities/fragments.
- Mapping code tolerates malformed data inconsistently.
- Shared constants hide backend path complexity instead of testing it.
- Authentication providers are enabled/disabled by config, but UI flow depends
  on timing-sensitive setup.
- Test coverage is effectively absent around critical flows.

## Migration Requirements

- Keep Firebase path generation centralized and tested.
- Introduce repository interfaces before adding Firebase packages.
- Keep playback as an app/service concern independent from widgets.
- Enforce admin authorization on the server side.
- Add tests as each flow moves from legacy Android into Flutter.

## Implemented Mitigations In Flutter

- Bootstrap now fetches Remote Config before app navigation.
- Force-update decision is based on `requiredVersion` and current build number.
- Firebase read repositories are isolated behind domain interfaces.
- Radio, program, and episode read flows now have Flutter UI paths backed by
  repositories instead of placeholders.
- Playback is isolated behind `PlaybackEngine` and no widget reference is stored
  in playback code.
- Logout is routed through `AuthSessionRepository.signOut()`, which maps to
  `FirebaseAuth.signOut()` when Firebase is active.
- Admin UI visibility is now loaded through `AdminRoleRepository` instead of
  trusting local preferences.
- Admin content commands are guarded and preserve existing document ids,
  including `Episode.episodeId`, to avoid the legacy edit-as-create bug.
- The first admin form now routes episode save/delete through the guarded
  service and requires confirmation before deletion.
- Radio and program admin forms now route save/delete through the same guarded
  service and use stable ids.
- Episode admin form now persists multiple `programScheduleTime` entries instead
  of dropping schedule metadata.
- Admin forms now preserve image URL/tag/category metadata for radios, programs,
  and episodes.
- Admin media uploads are routed through a Storage repository boundary, keep the
  legacy object path, and update the relevant URL fields after successful
  uploads.
