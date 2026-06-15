# Firebase Setup

The Flutter migration now has Firebase package dependencies, repository
adapters, admin media uploads, and reference Firestore/Storage rules. Platform
configuration is intentionally not invented in the repo because it must come
from the real Firebase project.

## Required Before Production Data

1. Install and run FlutterFire CLI for the target Firebase project.
2. Generate `lib/firebase_options.dart`.
3. Add Android `google-services.json` under the correct flavor/app path.
4. Add iOS `GoogleService-Info.plist` to the Runner target.
5. Confirm the selected base document:
   - `HudHudFM` for development.
   - `HudHudFmGooglePlay` for Google Play.
   - `InterNews` for Internews.
6. Pass the selected base document at runtime:
   ```bash
   flutter run --dart-define=HUDHUD_FIREBASE_BASE_DOCUMENT=HudHudFM
   ```
   Optional UI label:
   ```bash
   flutter run \
     --dart-define=HUDHUD_FIREBASE_BASE_DOCUMENT=InterNews \
     --dart-define=HUDHUD_DATA_SOURCE_LABEL=Firebase-InterNews
   ```
7. Review `firebase/firestore.rules` and `firebase/storage.rules` against the
   target Firebase project.
8. Run against the Firebase emulator first for read, auth, write, and media
   upload flows.

## Verification Commands

```bash
flutter pub get
flutter analyze
flutter test
flutter build apk --debug
npm install
npm run emulators:test
```

## Release Blockers

- Do not enable production admin writes until the checked-in Firestore/Storage
  emulator tests are run against the target rules and reviewed with the real
  Firebase project configuration.
- Do not point the app at production data before emulator tests cover the
  legacy nested paths.
- Do not commit private Firebase service account keys or signing secrets.
