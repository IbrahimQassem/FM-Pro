# Admin development handoff

Date: 2026-09-07

The Arabic-first replacement admin is implemented locally in `web_admin`.
It includes guided content editors, root-scoped Firebase workflows, a weekly
agenda, content filters, moderation context/decisions, editorial summaries,
and responsive burgundy themes. Profile image upload and cleanup work spans
Flutter, Functions, Firestore and Storage. Codex/Gemini setup remains preserved.

## Verification recorded

- Latest ordinary admin suite: 26 passed, 6 dedicated emulator tests skipped.
- Dedicated admin emulator suite: all 6 scenarios passed, including actual save transactions in both data roots.
- Latest TypeScript, lint, synthetic development build and whitespace checks passed.
- Earlier emulator, Flutter and native build evidence is recorded in the acceptance audit.
- Browser verification used only synthetic local data.

## Completion limits

This is a development handoff, not a production-ready certification. The detailed
remaining inventory is [the acceptance audit](admin-web-acceptance-audit.md).
English web localization remains unimplemented. Further work includes runtime
failure/retry coverage, full accessibility and mapper review, successful audio
playback, Flutter screen parity, and physical camera/gallery verification.
The build retains a large JavaScript bundle warning. No deployment occurred.

## Operator review

1. Open the local admin preview and confirm the development environment badge.
2. Review stations, programs, episodes, cities and banners; use filters and previews.
3. Review the weekly agenda and optional schedule behavior.
4. Inspect open/closed moderation records and their context before any action.
5. Review editorial summaries and follow the draft link.
6. Check public privacy, terms, community and isolated account-deletion routes.

## Before release

Complete the acceptance inventory, review the full uncommitted diff, and record
an approved revision. Run the relevant admin, Rules, Functions and Flutter checks
against that revision. Build separately with an explicit selected data root and
real release configuration. Review required Firestore indexes and Storage rules
against the existing shared bucket before deployment. Production deployment
requires its own authorized step.

Retain the prior hosting artifact and approved Rules/Functions configuration
before release. If rollout fails, restore that artifact and its compatible
configuration through the established deployment process; do not roll back
Firestore content with broad deletes or reset shared Auth. No production backup
or rollback artifact has been captured during this local development session.
