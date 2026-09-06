# Release candidate handoff

Status: preparation only — not a signed or store-approved candidate.  
Progress and results: [execution tracker](store-release-execution-plan.md).  
Environment/account decisions: [ADR 0002](../decisions/0002-store-release-boundaries.md).

## Build and deployment manifest

| Field | Required value / current evidence |
|---|---|
| Source | Record the final reviewed commit and clean dependency locks before packaging; current work is uncommitted. |
| Flutter / Dart | Locally verified toolchain: Flutter 3.44.0 / Dart 3.12.0. |
| Functions / JS verification | Node 22; temporary local verifier runtime is `/tmp/hudhud-release-node22/node_modules/node/bin/node`. This is tooling, not a repository dependency. |
| Data roots | Official mobile release and admin use `HudHudOfficial`; Development uses `HudHudDev`; Firebase Auth remains shared. |
| Android identity | `com.sanaadev.hudhudfm`; confirm existing Play listing, upload certificate and next unused versionCode. |
| iOS identity | `com.sana.dev.fm`; numeric `IOS_APP_ID` and distribution provisioning remain required. |
| Domain | Supply/approve `APP_DOMAIN` and verify all four public legal/deletion routes in a private browser. |
| Signing | Android `key.properties` was absent during guard verification. Supply credentials outside Git; do not print them in evidence. |
| Versions | Select build name/number from actual console history; do not assume source `1.0.0+1` is unused. |
| Artifacts | Retain signed AAB/archive, checksums, Android mapping and Apple dSYMs; none certified yet. |

## Compatible backend and website delivery

Before any production application, review the exact diff, target project, canonical
roots, indexes, account deletion semantics and rollback package. Deployment is a
separate executed action; these commands are not evidence of deployment.

1. Verify backups/compatibility and any existing comment-status migration with a
   dry run; do not run seed/demo data against Official.
2. Configure the mail secret and required OAuth/APNs providers securely. Backend
   functions include `requestEmailVerificationCode`, `verifyEmailCode`,
   `ensureAccountProfile`, `updateAccountProfile`, `deleteAccountData` and
   `cleanupUnverifiedAccounts`.
3. Apply reviewed indexes and backend as a compatible package, then reviewed
   Rules and clients/admin in the planned maintenance/release window. Do not
   expose the new deletion UI against the old Development-only backend.
4. Build admin with explicit `VITE_FIRESTORE_ROOT=HudHudOfficial`; verify its
   target Firebase configuration separately. Root selection is not project
   authentication or a tenant-isolation boundary.
5. Publish reviewed privacy copy, including the temporary deletion marker.
   Confirm scheduled cleanup runs and alert on failures or overdue markers.
6. Verify disposable accounts in the approved environment: registration,
   verification, profile save, comments/report/moderation and account deletion
   for each shipped provider. Capture sanitized results; never use real user
   data for destructive acceptance tests.

## Candidate build recipe

Run the local gates in the execution tracker first. Once real store IDs, signing,
versions and approved domain are supplied, use the existing Flutter commands:

```text
flutter build appbundle --release --build-name=<approved-version> --build-number=<unused-number> --dart-define=FIRESTORE_ROOT=HudHudOfficial --dart-define=APP_DOMAIN=<approved-https-origin>
flutter build ipa --release --build-name=<approved-version> --build-number=<unused-number> --dart-define=FIRESTORE_ROOT=HudHudOfficial --dart-define=APP_DOMAIN=<approved-https-origin> --dart-define=IOS_APP_ID=<numeric-store-id>
```

Angle-bracket values are instructions to fill, not executable sample values.
Android and iOS guards reject invalid root/signing/store-ID configurations.
The iOS archive phase uploads Crashlytics symbols; retain its successful output
without publishing configuration details. Verify Android mapping upload and
controlled crash delivery separately; a plugin/build phase alone is not proof.

## Remaining sign-off evidence

- [ ] Numeric Apple ID; first publication versus update on each store.
- [ ] Correct signing identity, provisioning, registered OAuth callbacks and APNs.
- [ ] Public domain/legal/deletion links and working provider sessions.
- [ ] Content/stream/logo rights, legal approval and moderation/on-call owners.
- [ ] Exact release artifact IDs, roots, versions, target SDK, 16 KB compatibility,
      entitlements, privacy manifests and symbolication checked.
- [ ] Physical-device matrix from the readiness review completed, including
      background audio >30 minutes, calls, Bluetooth, offline/retry, FCM, RTL and
      200% text scale. Include tablets if shipped.
- [ ] Store privacy/data-safety/age-rating forms, screenshots, review access and
      applicable account/testing eligibility checked against actual app behavior.
- [ ] Platform-specific rollout and forward-fix recovery plan accepted.

Store readiness is not complete while any required item above lacks evidence.
The dated review's historical failures remain intact; current successes and
remaining blockers belong in the execution tracker.
