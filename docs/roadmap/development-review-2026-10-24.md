# Development review — 17–24 October 2026

Reviewed: 2026-10-24 (Asia/Aden). Source baseline: `main` at `5eac31c`.
Purpose: reconcile the last week's development with remaining scope and inform the
[November roadmap](november-2026-roadmap.md). This is a scoped source review,
not a production audit or release certification.

## 1. Delivery state

- GitHub confirms `main=5eac31c` and `hudhud_fm=5a22422`; the latter is seven
  commits behind `main` and still points to the v3.2.0 source release.
- [PR 1](https://github.com/IbrahimQassem/FM-Pro/pull/1) and
  [PR 2](https://github.com/IbrahimQassem/FM-Pro/pull/2) are merged into `main`.
  Their merge timestamps fall on October 24 in Asia/Aden.
- GitHub has no open issues at review time. This is not evidence of no defects;
  the existing roadmap and findings below are the actionable backlog.
- `pubspec.yaml` remains `3.2.0+37`. A tag, merged PR, or version number does not
  prove deployment of Functions, Rules, clients, seeds, or migrations.
- No branch was moved, no code was pushed, and no live data was accessed in this
  review. Branch reconciliation is a prerequisite to implementing on `hudhud_fm`.

## 2. What changed during the week

| Area | Evidence | Assessment |
|---|---|---|
| Admin imports | `8e002c8`, `56fd0bc`, `e39299d`; `web_admin/lib/batch-import.ts` and modal | Import previews, valid-row selection, duplicate classification and update handling added. Race/retry and full emulator acceptance still need a current integration record. |
| RSS ingestion | `9ae5962`, `bfa0c10`; `functions/lib/rss-ingestion.js` | Batch/statistics work and deterministic identity remediation landed; do not reschedule the original UUID defect as if untouched. Destination validation remains incomplete. |
| v3.2.0 preparation | `5a22422`; [validation](../releases/v3.2.0/release-validation.md) | Historical evidence includes 257 Flutter tests and Android/iOS simulator builds. It predates the later remediation and October 24 changes. Physical-device/store readiness was explicitly not established. |
| Platform remediation | `bfa0c10`; [October analysis](INDEPENDENT_PLATFORM_ANALYSIS_2026-10-19.md) | Changes address account reset semantics, Rules, moderation, consent, stream health, HTTPS episode parity, update lifecycle and Arabic search. Presence of changes does not close every PL/IR acceptance criterion. |
| Locations and station experience | `e39299d`, `b95fc68`; [October packages](governorates-stream-import-card-roadmap-2026-10.md) | Location picker, seed/migration tools, station cards, default artwork, outage messaging and admin healthy-stream filter added. Pan-Arab classification needs correction before relying on geographic filters. |
| Subscriptions and editorial audit | `e39299d`; Functions subscriptions and editorial-audit modules | Subscription/profile handling expanded. Editorial callable exists, but the normal editor/import write path does not call it; PKG-10 is incomplete. |

Existing capability should be extended rather than rebuilt: station favorites,
station following, episode alerts, sleep timer, Arabic-normalized Flutter search,
station history on web, and program/episode favorite model types already exist.
The player repository currently exposes load/play/pause/stop, not seek/progress
or speed controls.

## 3. Findings requiring follow-up

Priorities are planning priorities. P0 blocks rollout of the affected path; it
does not assert an observed production incident. Locations below refer to the
baseline commit and named functions remain authoritative as lines change.

| ID / priority | Evidence and impact | Acceptance required |
|---|---|---|
| REV-01 / P0 | `functions/lib/editorial-audit.js:62–110`, `saveAdminContent`: authorization checks submitted `content.stationId`, then merges into an existing ID without checking its current station. A local mock reproduced station A's admin overwriting station B's program by submitting A. The exported callable uses Admin SDK, so client Rules do not protect this write. Deployment status is unknown. | In one transaction validate role, current and destination ownership, parent relationships, allowed fields, and deletion/concurrency state. Both roots must reject cross-station program/episode overwrites and allow legitimate own-station edits. |
| REV-02 / P0 before running cleanup | `tool/remove_old_locations.mjs:14–15,48–70`: defaults to both roots including Official, deletes noncanonical records immediately, and writes its backup only after deletion. There is no dry-run/apply gate or reference check. A failure can leave deleted records without a saved backup. Source-confirmed; script was not executed. | Default read-only; explicit project/root and reviewed apply manifest; durable backup before writes; refuse referenced/unresolved locations; bounded resumable batches and emulator restore proof. |
| REV-03 / P1, block fetch-job expansion | `functions/lib/stream-health.js`, `isSafePublicUrl` accepts IPv6 loopback; `functions/lib/rss-ingestion.js`, `fetchAndParseRss` reaches injected fetch for a private 172.16 address. Both reproduced locally without network. Source also lacks resolved-IP validation, per-redirect validation and explicit body-size caps. | Reject private/loopback/metadata destinations across IPv4/IPv6, DNS resolution and redirects; enforce bytes/time/concurrency limits. Verify legitimate public streams and RSS still work. |
| REV-04 / P1 | `web_admin/components/admin/admin-app.tsx`, `saveWithRelations`, and `web_admin/lib/batch-import.ts` write directly through `web_admin/lib/save-content.ts`. That path stamps actor fields but writes no audit-log entry. `adminSaveContent` has no admin-client caller. Its separate implementation also lacks the existing relationship-counter/transfer checks. | Preserve relationship semantics while integrating a single trusted save path; content, counters and immutable audit entry succeed or fail together. Test editor and import, retries, transfers and forged actor metadata. Never wire the current callable into the UI before REV-01. |
| REV-05 / P1 | `functions/lib/program-notifications.js:153–165` stamps `lastNotifiedDate` before send. A send failure suppresses retry for the day; concurrent scans can still both pass the earlier check. `broadcastNotification` retains send-before-history behavior. Source-confirmed; no real FCM tested. | Durable operation identity and explicit pending/sent/failed/unknown outcomes; tests for concurrent workers, send failure, lost acknowledgment and history-write failure. Do not promise exactly-once FCM delivery. |
| REV-06 / P1 | `CANONICAL_GENERAL_ARABIC_LOCATION` in `tool/firebase_seed/canonical_locations.mjs` encodes “عربي” as a Yemeni governorate. The location contract only defines governorate/national. Flutter discovery filters by YE, so changing the seed alone could hide these stations. | Agree a distinct regional classification; update contract, mappers, selectors, filters and fixtures together; reviewed migration preview. Pan-Arab stations remain discoverable without appearing as a Yemeni governorate. |
| REV-07 / P2 | `web_hudhud/public-home.tsx`, `FeaturedCard`/`StationCard`, computes stopped state directly from offline/failure counters, while `resolveStreamHealthState` in `lib/stations.ts` applies the 45-minute freshness rule. A stale result can produce different source-status messaging across views. Source-confirmed divergence; browser reproduction pending. | One interpretation per platform with shared fixtures for fresh/stale/unknown/backup/no-source and device errors; stale results never assert a current source outage. |
| REV-08 / P2, quality gate | `lib/features/player/presentation/widgets/now_playing_sheet.dart:49` still uses `TickerMode.of`. The release validation records a nonzero analyzer exit for its deprecation. Current source still contains it; analyzer was not rerun here. | Use the SDK-compatible API, retain ticker behavior and reach a clean analyzer gate without suppression. |

The canonical location list also needs editorial validation of its claimed
governorate coverage; counting 22 entries is not a semantic accuracy test. No
external geography verification was performed in this review.

## 4. Scope reconciliation

| Existing work | November treatment |
|---|---|
| PL-01/02/03 remediation | Revalidate negative authorization, account-state and moderation-race cases on the integrated commit. Do not reopen already-fixed cases without failing evidence. REV-01 is an additional newly introduced write path. |
| PKG-01/02/03 | Tools and picker exist; data migration completion is unverified. Close REV-02/06 and collect per-root reports before declaring these complete. |
| PKG-04/05/06/08/09 | Implementation exists. Require integrated UI/subscription acceptance rather than budget a second implementation. REV-07 is targeted consistency work. |
| PKG-07 | Dedup implementation exists; prove two concurrent imports, partial retry and unchanged re-import against emulator data. |
| PKG-10 | Partial: actor fields and standalone callable are not end-to-end audited editing. REV-01/04 own completion. |
| PKG-11 and PL-06/07 | October 19 evidence is stale for October 24 changes. New baseline, supported runtime and device acceptance remain necessary. |
| PL-04/08/10 | Target notification delivery, fetch protection, health consistency and episode controls. |
| PL-12/13/16/17 | Full cross-platform library, program follows/feed, expanded community and PWA remain later/stretch scope. |

## 5. Verification performed on October 24

| Check | Result / limit |
|---|---|
| Git status, history and GitHub branch/PR/issue reads | Clean starting worktree; remote hashes match the baseline above; two merged PRs, zero open issues. |
| `npm test` in `functions` | 85 passed, zero failures/skips. Runtime was local Node **26.6.0**, while Functions targets Node 22; this is exploratory evidence, not the supported-runtime release gate. |
| `node --test tool/firebase_seed/test/*.test.mjs tool/test/migrate_station_locations.test.mjs` | 18 passed, zero failures/skips, Node 26.6.0. These tests do not cover `remove_old_locations.mjs`. |
| Admin `./node_modules/.bin/tsc --noEmit --incremental false` | Passed, no diagnostics. |
| Temporary inline assertions against imported Functions modules | Reproduced REV-01 ownership bypass, stream IPv6-loopback acceptance and RSS private-address fetch acceptance using synthetic objects/injected fetch. No network or Firestore writes. |
| Documentation checks | `./tool/verify-governance.sh` and `git diff --check` passed; nine relative links in the two new documents resolve and code fences are balanced. |
| Flutter, full web tests/builds, emulators, devices, deployed environment | Not run for this planning review. Existing historical results are labeled separately; no release-readiness claim. |

The passing tests do not cover the newly reproduced negative cases. The first
implementation task is to turn those cases into durable regressions, then fix
them. Temporary command logs are under `/tmp/hudhud-nov-review-*`; they are not
durable acceptance artifacts or part of the deliverable.
