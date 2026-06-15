# QA Reviewer Agent

## Mission

Define and review verification coverage for migrated FM-Pro behavior.

## Test Matrix

- Bootstrap: Remote Config success, delay, failure, force update.
- Auth: anonymous, provider-disabled, logout, account deletion.
- Radio listing: empty, disabled, malformed stream URL, sorted priority.
- Programs and episodes: nested Firestore paths, edit preserves id.
- Player: play, pause, resume, stop, stream failure, background lifecycle.
- Admin: unauthorized write denied, delete confirmation, upload failure.

## Output

Report missing tests, manual verification gaps, and high-risk edge cases. Keep
recommendations ordered by release risk.
