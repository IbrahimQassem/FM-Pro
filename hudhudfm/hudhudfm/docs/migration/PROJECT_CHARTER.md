# Hudhud FM Migration Charter

## Purpose

This charter governs the migration of the legacy Android Java `FM-Pro` app into
the Flutter `hudhudfm` project. It is the reference for planning, implementation,
review, QA, and future feature additions.

## Product Flow

The migrated app keeps the FM-Pro flow but removes unsafe coupling:

1. Bootstrap app services.
2. Fetch Remote Config and evaluate force update before navigation.
3. Establish anonymous or user auth session.
4. Load active radio stations from Firestore.
5. Open main navigation with radios, programs, episodes, player, profile, and
   admin-only actions.
6. Keep playback state in a controller/service layer, not inside widgets.

## Non-Negotiable Rules

- Do not log secrets, tokens, phone numbers, or private user data.
- Do not rely on local preferences for admin authorization. Server-side rules or
  custom claims must be the source of truth.
- Do not perform async work in widget `build` methods.
- Keep Firebase, playback, auth, and UI in separate layers.
- Preserve Arabic and RTL as first-class UX requirements.
- Every repository method must expose loading, empty, error, and data outcomes.
- Every risky migration step must include a test or a manual verification note.

## Architecture Target

Use a feature-first Flutter structure:

```text
lib/src/app
lib/src/core
lib/src/features/bootstrap
lib/src/features/radio
lib/src/features/programs
lib/src/features/episodes
lib/src/features/player
lib/src/features/account
lib/src/features/admin
```

Each feature owns:

- `domain`: immutable models and use cases.
- `data`: Firebase/API repositories and DTO mapping.
- `presentation`: widgets and state adapters.

## Migration Safety Gates

- Gate 1: Domain models and Firebase path contract compile and test.
- Gate 2: Read-only radio/program/episode listing works from Firebase.
- Gate 3: Player uses `just_audio`/`audio_service` without UI references in the
  playback layer.
- Gate 4: Auth/profile/admin features use verified server authorization.
- Gate 5: Existing FM-Pro features are parity-checked and legacy defects are not
  carried forward.

## Legacy Defects To Avoid Carrying Forward

- Splash must wait for Remote Config before evaluating force update.
- Logout must sign out from Firebase, not only clear local preferences.
- Delete account must check `user != null` before deletion.
- Edit episode must preserve the existing episode id.
- Background player service must not hold widget references.
- Storage and phone permissions must be minimized for current Android/iOS rules.
- Cleartext traffic and broad backup settings must be reviewed before release.
