# HudHud FM v3.2.0

App version: **3.2.0+37**.

## Changes

- Bring the HudHud Flutter application, administration console, public web player and Firebase Functions development history onto `main`.
- Add content lifecycle automation and spreadsheet synchronization, with XLSX/CSV import templates and validation in the administration console.
- Improve program and episode management, scheduled now-playing resolution, player behavior and public app discovery.
- Correct RSS nested statistics and atomically save each new episode with its program counter; include failure and retry regression tests.
- Apply release version metadata, Dart formatting and a redundant TypeScript union cleanup.

## Scope

This is a source-code release. No store submission, Firebase deployment, signing, production data migration or backfill was performed. Debug and simulator builds are validation artifacts, not distributable release packages.

Validation results are recorded in `docs/releases/v3.2.0/release-validation.md`.

## Verification summary

- Flutter: 257 tests passed; Android Debug and iOS Simulator builds passed.
- Node 22: Functions 70/70; public web 45/45; admin 62 passed and 7 emulator-dependent skips.
- Demo emulator checks: Rules 26/26, account deletion 3/3, admin 7/7, profile images 3/3.
- Both web builds and JavaScript/TypeScript lint passed.
- Known follow-ups: Flutter analyzer reports one informational `TickerMode.of` deprecation (nonzero exit); web bundle size and future Kotlin/Swift plugin compatibility warnings remain.
