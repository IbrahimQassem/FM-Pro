# ADR 0003 — Station follows and episode alerts

Date: 2026-09-08. Status: accepted for local development; no deployment or release.

Station follows and favorites are distinct. Follow requires a verified, active
listener. A new/refollowed station starts with alerts off; unfollow writes
`isActive=false, notificationsEnabled=false`. A separate explicit action requests
notification permission; denial preserves following. My Stations resolves public
canonical content and retains an unavailable reference with an unfollow action.

`setStationSubscription({root, stationId, isActive, notificationsEnabled})` is the
Flutter mutation boundary. It checks Auth and deletion barriers server-side,
serializes on `station_<stationId>`, normalizes at most 100 matching legacy station
records and preserves the earliest valid creation timestamp. Larger sets fail
without writes. Existing program records and administrative review/removal remain
compatible. Existing canonical records take precedence; otherwise the latest legacy
record (updated time, then document ID) determines the effective preference,
including opt-outs. Clients never update subscriber counters.

`registerStationAlertDevice({root, token})` and
`unregisterStationAlertDevice({token})` own device registration. A SHA-256 token
identifier keys a server-only `notificationDeviceOwners/{id}` record and
`{root}/users/users/{uid}/alertDevices/{id}`. Registration transfers the current
device away from a previous account/root and allows at most 20 devices per account
per root. Tokens exist only in the SDK and private backend; application preferences
store a device-opt-in boolean, never the token or UID. Normal logout waits for
unregistration before changing Auth; a failed cleanup leaves a recoverable sign-out
error. Account deletion removes registrations in both roots. Rotation/restart/
foreground reconciliation refreshes registration; stale registrations expire after
30 days through bounded collection. General announcements remain independent.

Published creates and the first false→true publication transition create a durable
per-episode marker at `{root}/episodeAlertPublications/markers/{episodeId}` plus a
job at `{root}/episodeAlerts/jobs/{episodeId}`. No historical backfill, no resend on
editing/republication, and no automatic publishing based on broadcast dates.
A minute scheduler processes up to 20 jobs per root, 25 subscription records per
page and 20 devices per account. Only verified active listeners with active,
alert-enabled subscriptions qualify. Validate current station/program/episode
visibility and relationships; respect account deletion barriers and device owners.

Jobs use a transaction lease, cursor, per-device delivery receipts and exponential
retry up to one hour between attempts, expiring after 24 hours. Completed delivery
jobs/receipts are removed after 30 days; minimal non-personal publication markers
remain to prevent republication sends. Invalid registrations are removed only if
not refreshed since the failed attempt. No raw errors, tokens or user data enter
logs. FCM acknowledgement is not proof of device receipt and exactly-once delivery
is not promised across ambiguous crash/retry boundaries.

Only version-1 `episode` payloads with the selected root and bounded canonical
IDs can navigate. Foreground notifications remain in the session list; tapping
opens the program with the episode highlighted first, without autoplay. Background
and cold-start taps wait for Home/startup readiness. Missing episode/program falls
back to station, missing station to Home. Network failures remain retryable.
Arbitrary URLs and external deep links remain unsupported.

Lifecycle: one account-bound subscription listener; cancel/reset on identity or
verification change, ignore prior-generation completions and deduplicate pending
station writes. Private device/job collections remain denied by the existing
catch-all Rules, including to admin clients. Dedicated emulator tests prove this.

Validation uses synthetic accounts/data and an injected FCM sender. New indexes,
Functions and device delivery require a separately authorized development
deployment before external verification; they are not deployed by this task.
