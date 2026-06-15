# Hudhud FM Flutter

Flutter migration target for the legacy `FM-Pro` Android project.

## Current Scope

- Firebase-aware app bootstrap with in-memory fallback when native Firebase
  configuration is not present.
- Radio, program, episode, account, player, admin, and media-upload boundaries.
- Legacy Firestore and Storage path contracts documented and covered by tests.
- Reference Firestore/Storage rules for emulator review before production use.
- Development role guides under `.agents/`.

## Main References

- Project charter: `docs/migration/PROJECT_CHARTER.md`
- Review report: `docs/migration/REVIEW_REPORT.md`
- Migration plan: `docs/migration/MIGRATION_PLAN.md`
- Firebase contract: `docs/migration/FIREBASE_CONTRACT.md`
- Firebase setup: `docs/migration/FIREBASE_SETUP.md`
- Execution summary: `docs/migration/EXECUTION_SUMMARY.md`
- Token budget: `docs/migration/TOKEN_BUDGET.md`

## Verification

Run these from this directory:

```bash
flutter pub get
dart format lib test
flutter analyze
flutter test
flutter build apk --debug
```

Firebase rules are stored in `firebase/firestore.rules` and
`firebase/storage.rules`. Run them through the Firebase emulator before using
production data.
