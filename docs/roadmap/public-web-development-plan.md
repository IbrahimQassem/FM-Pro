# Public web development plan

Updated: 2026-09-13. Target: `web_hudhud`. Release and deployment excluded.

The original implementation request selected the first three phases, including
optional accounts and browser alerts. The follow-up below is a proposed plan;
updating this document does not start its implementation or authorize deployment. [ADR 0004](../decisions/0004-public-web-accounts-and-discovery.md)
owns this extension of the public read-only experience. Guest browsing/listening
remains read-only, with no sign-in gate or fabricated fallback content.

## Implementation tracker

| Card | Phase | Delivered implementation | Evidence |
| --- | --- | --- | --- |
| WEB-01 | 1 | Isolated media attempts, one backup, resource cleanup, bounded connection timeout | Media race/fallback/timeout tests |
| WEB-02 | 1 | Connecting/playing/paused/error states, explicit retry, successful-play history | Media tests and invalid-source browser flow |
| WEB-03 | 1 | Catalog generation guards, malformed/removed filtering, retryable SDK initialization | Browser overlapping-request fixture and SDK regression test |
| WEB-04 | 1 | RTL mobile controls, readable secondary text, focus/menu semantics, reduced motion | 360px/1280px screenshots, keyboard and DOM checks; broader device acceptance remains external |
| WEB-05 | 1 | Honest recent-listening recommendation and recency ordering | Mapping/recency tests |
| WEB-06 | 1 | Node tests, lint, TypeScript build gate, reproducible dependencies | Node 22 checks and explicit HudHudDev build |
| WEB-07 | 2 | Station details, active programs, published episodes, timezone schedules, cache/server recovery, shared episode player | Content/schedule tests and synthetic browser details/unavailable-content checks |
| WEB-08 | 2 | Bounded browser favorites, recent list, clear-history action, storage failure handling | Storage tests and browser favorite persistence/filter checks |
| WEB-09 | 2 | Shareable station/content URLs, canonical/title/description/Open Graph metadata, existing policy and Android links | Route validation tests and browser navigation; social crawlers may retain static metadata |
| WEB-10 | 2 | Measured local rendering sample and build sizes; deferred optional chunks | Build report and fixture timing. No production read-cost/latency claim or unmeasured index changes |
| WEB-11 | 3 | Optional email/password Auth, server OTP/profile calls, password reset and recent-auth deletion; extended by WEB-15/16 | Existing callable contracts and synthetic account UI; live integration remains pending |
| WEB-12 | 3 | Account-bound station follows, canonical legacy resolution, unavailable references, separate station alert opt-in | Resolution tests, browser follow/failure cases, subscription and rules emulator gates |
| WEB-13 | 3 | Bundled browser worker, VAPID/capability gating, device registration/rotation/cleanup, foreground list, allowlisted notification navigation | Device lifecycle/route tests, bundled worker build, unavailable-push UI; real receipt remains external |
| WEB-14 | Follow-up | App burgundy/blush tokens, rounded controls, shared brand/mascot assets and mobile feedback states | Lint/build and desktop/390px/320px browser checks; web assets matched app sources |
| WEB-15 | Follow-up | Google popup login, safe cancellation/configuration/conflict feedback, trusted email-verification gate and Google deletion reauthentication | Repository regression tests and synthetic Google browser journeys; real OAuth consent remains pending |
| WEB-16 | Follow-up | Guest/account hub, separate login/register/manage views, name/photo editor, four portable avatars, camera/file input and provider badges | Profile validation tests; synthetic save/cancel/failure and JPEG preview; real server image round trip remains pending |

**Current baseline: WEB-01–16 implemented locally.** This is an implementation
inventory, not a claim of full integration or release acceptance. The latest
account increment passed 34 web tests, two existing backend image tests,
lint/typecheck/build and governance checks. These are recorded results from the
implementation session, not commands rerun for this documentation update.
The local app was opened successfully; no production publication occurred in
this work. New cards below remain **proposed**, with no completion percentage.

## Remaining acceptance evidence and configuration

- Real Firebase provider/authorized-domain and public VAPID configuration, plus
  real foreground/background/cold-start browser receipt. Emulator/fake results do
  not establish notification delivery. Use a disposable development account when
  a separately authorized development environment is available.
- Real radio sources, interruptions/autoplay policies, mobile Safari, native
  browser 200% zoom and screen-reader review. Existing browser checks use Chrome
  synthetic fixtures and DOM/AX evidence; they do not establish these device cases.
- iOS store link requires the numeric ID from App Store Connect/AppConfig. No
  placeholder link is invented; Android uses the existing package identity.
- Real catalog latency/read volume and crawler previews require a configured site.
  Metadata is updated client-side; crawlers that do not execute JavaScript see the
  static landing metadata. Consider prerendering only with a measured need and a
  separate content freshness design.

See the [completion handoff](public-web-development-handoff.md) for exact scope,
commands, limitations and files. These external items are not silently marked as
verified; release/deployment acceptance is tracked separately from implementation.

## Recommended next iteration

Start with **WEB-17 → WEB-18 → WEB-19**, addressing live account confidence,
clearer navigation and everyday listening. These have more immediate value than
adding more sign-in providers or introducing another framework. WEB-20/21 are
small follow-up improvements. WEB-22 closes push acceptance if browser alerts
will be included in the public release. Other cards can ship in later increments.

Priority meanings: P0 = evidence required before relying on the affected feature
in a release; P1 = next user-facing improvement; P2 = later product expansion.
Effort S/M/L describes relative scope, not a delivery date. Owners describe the
responsible workstream; they are not delegated agents.

| Card | Priority / effort | Outcome | Dependencies | Status |
| --- | --- | --- | --- | --- |
| WEB-17 | P0 / M | Prove real Google/email/profile journeys | Development configuration and disposable account | Proposed; external evidence needed |
| WEB-18 | P1 / M | Clear home, station and account navigation | Existing query/hash routes; document any routing change | Proposed |
| WEB-19 | P1 / M | Useful episode controls and device media actions | WEB-18 shared-player invariant | Proposed |
| WEB-20 | P1 / S–M | Better Arabic search and schedule defaults | Existing catalog and content contracts | Proposed |
| WEB-21 | P1 / S | Faster, consistent brand assets | Measured baseline; existing app assets | Proposed |
| WEB-22 | P0 if alerts ship / M | Prove notification delivery and cleanup | WEB-17; VAPID, test device and test recipient | Proposed; external evidence needed |
| WEB-23 | P2 / L | Favorites available across devices | WEB-17; persistence/merge decision and write contract | Proposed; design decision needed |
| WEB-24 | P2 / L | Episode comments with app moderation parity | WEB-17; UGC/write contract and moderation gates | Proposed; design decision needed |
| WEB-25 | P2 / M–L | Installable web app with an honest offline screen | WEB-21/22; worker/cache lifecycle decision | Proposed; design decision needed |
| WEB-26 | P2 / M | Reliable station links in search/social previews | Public canonical origin; content freshness design | Proposed; design decision needed |
| WEB-27 | P0 / M | Reviewable release candidate and rollback | WEB-17, applicable WEB-22, accepted release scope | Proposed; no publishing implied |

### WEB-17 — Account integration and accessibility acceptance

Owner: Web accounts + QA. Scope: `account-panel.tsx`, profile components,
`lib/account-repository.ts`, account fixtures/tests and setup evidence.

- Check Google provider and authorized domains without exposing credentials;
  exercise new/returning Google users, cancelled/blocked popups and conflicts.
- Test email registration, OTP/re-send, missing email, password reset, sign-out,
  unverified/disabled profiles and a session restart. Session persistence is
  intentional; a persistent “remember me” option needs a separate decision.
- Save a name, mascot and uploaded JPEG/PNG, then reload web and app against the
  same data root. Confirm name-only changes retain the current photo, failed
  saves retain the draft, and account changes cannot reuse another user's draft.
- Verify Google/password deletion only with an explicitly disposable account:
  cancellation/cleanup failure must preserve the account. Auth is shared across
  both roots; a development root is not an isolated account-deletion sandbox.
- Run keyboard/dialog focus, 200% native zoom and screen-reader checks; test
  Chrome/Android and Safari/iPhone, including real camera/gallery selection.

Done when: results identify device/browser, root, outcome and remaining failures;
all account blockers have a regression check or documented external reproduction.
No real credentials, personal photos, tokens or account identifiers enter reports.

### WEB-18 — Make account and station views feel like destinations

Owner: Web UX. Scope: `public-home.tsx`, `account-panel.tsx`, `station-detail.tsx`,
`styles.css` and browser fixtures.

Current account UI opens below the catalog, while its login/manage subviews use
local component state. Station details also share the page with discovery
sections. Give each active destination a clear top-level content area and active
navigation state; retain the player outside that content area. Preserve existing
station/program/episode links. Prefer the existing route mechanism; no router
package is assumed. Record Back/Forward and subview URL behavior before coding.

Done when: Home → station → account → profile → Back/Forward works on reload and
at 320px/desktop; focus moves to the destination heading; returning to discovery
retains useful filters; no duplicate playback instance or automatic playback.

### WEB-19 — Improve listening controls

Owner: Playback + Web UX. Scope: `lib/radio-player.ts`, `public-home.tsx`, player
styles and media tests; keep one playback owner.

Add episode elapsed/duration, seek and ±15-second controls, plus playback speed
and a sleep timer. Treat live radio separately: no invented duration or seek bar.
Add mute/volume where the browser supports them. Add Media Session metadata and
play/pause actions progressively; unsupported actions retain in-page controls.
[MDN's action-handler reference](https://developer.mozilla.org/en-US/docs/Web/API/MediaSession/setActionHandler)
notes limited availability, so device checks are part of acceptance.

Done when: unavailable/infinite duration, seeking, source changes, timer expiry,
background interruption, headset controls and dispose are covered; current
race/backup/timeout behavior still passes and no stream URL is displayed or logged.
Do not promise continuous background playback on every browser.

### WEB-20 — Arabic discovery and schedule polish

Owner: Web discovery. Scope: catalog filtering in `public-home.tsx`,
`lib/discovery.ts`, `station-detail.tsx` and focused tests.

The current search lowercases and checks substrings. Add tested Arabic matching
for diacritics/tatweel and agreed letter variants without changing displayed
names; retain city/frequency matching and explicit filter reset. Add useful sort
choices using existing fields only. The schedule initially selects Monday;
choose today's day from the content's documented timezone/offset policy, with
midnight tests and clear upcoming/live/ended labels. Do not invent “popular”
rankings or require new indexes before measuring the query.

Done when: Arabic examples, combined filters, empty results and timezone boundary
cases pass; changes preserve real-catalog-only content and keyboard access.

### WEB-21 — Asset delivery and measurable performance

Owner: Web performance. Scope: `public/assets`, `styles.css`, HTML entry and asset
maintenance documentation. Keep the Flutter source assets intact.

Measure a production build on a throttled mobile connection before changing it.
Create appropriately sized web derivatives of the app icon and hero artwork;
keep an explicit source mapping and verify visual parity, layout stability and
fallbacks. Automate checking the mirrored brand tokens/avatar allowlist when
useful. Review font/image loading from the measurement. The discovery banner is
available, but adding it should support a real section rather than duplicate the
welcome illustration or imply live editorial content.

Done when: before/after byte counts and load/layout measurements are recorded,
assets render at tested sizes, and there is no unexplained regression. Baseline
measurements determine budgets; no speculative caching/index changes.

### WEB-22 — Browser notification acceptance

Owner: Messaging + QA. Scope: `notification-worker.ts`, `lib/browser-alerts.ts`,
`lib/device-registration.ts` and existing device/subscription gates.

Verify explicit browser permission and per-station opt-in on a designated test
recipient. Cover foreground/background, closed-tab opening, revoked permission,
refresh/token rotation, sign-out/re-login, account change and deletion cleanup.
Do not broadcast to real subscribers to validate delivery.

Done when: one eligible alert opens the correct canonical episode without
starting playback, ineligible recipients receive none, duplicate display is
absent, and denied/unavailable push leaves following and listening usable.

### WEB-23 — Cross-device favorites, separate from follows

Owner: Accounts/data + Web UX. Existing browser favorites are local station IDs;
account follows already sync and have a different meaning. Decide whether the
app's favorite schema is the shared source, how an explicit local-to-account
import works, how duplicates/conflicts resolve and what sign-out removes.
Inspect the app repository and Rules before choosing writes. The public web
currently requires personal mutations through callables; no favorite-write
callable is exposed by its account repository, so reuse cannot be assumed.

Done when: a documented contract precedes implementation, owner/guest/disabled
cases pass, two devices agree, switching accounts reveals no previous library,
and local guest favorites remain usable without forced sign-in or silent import.

### WEB-24 — Episode comments and community safeguards

Owner: Web community + Firebase data/security. Reuse the app's canonical episode
comments, public author projection and moderation model. Start with bounded
public reading, then add verified active-account writing, explicit current UGC
terms acceptance, reporting and blocking as one coherent write-capable release.
Confirm the public-web callable boundary against the app's existing Rules-based
writes; record the decision rather than bypassing it in a component.

Done when: hidden/removed comments stay hidden, forged/unauthorized writes fail,
terms/version gates and blocking are enforced, listener disposal is tested and
moderation actions have operational coverage. Don't release comment submission
without the associated moderation controls.

### WEB-25 — Installable web app and limited offline use

Owner: Web platform. The existing service worker serves messaging; there is no
manifest or offline app-shell strategy in the current entry. Design manifest,
icons, install affordance, version updates and worker scope together with FCM.
Avoid competing registrations or taking over the notification worker accidentally.
Start with a cached public shell and clear offline/retry messaging; live streams
still need a network. Account/API responses, profile uploads and audio must not
be indiscriminately cached. Define invalidation and sign-out behavior first.
[web.dev's caching guidance](https://web.dev/learn/pwa/caching?hl=en) explains the
explicit cache lifecycle needed for this work.

Done when: supported install/update/offline flows pass, stale shell recovery works,
FCM continues to receive/open alerts and offline screens do not claim live audio.
Downloaded episodes remain a separate storage/rights/product decision.

### WEB-26 — Public sharing and search previews

Owner: Web delivery/content. Client-side title/description/Open Graph updates are
already implemented. Evaluate the actual crawler result before selecting static
prerendering or a server response. Define canonical public URLs, approved artwork,
refresh/removal handling and a bounded station sitemap; exclude account/private
views and development URLs from discovery. Keep one public app/hosting target.

Done when: the HTML served for a station exposes correct public metadata without
requiring JavaScript, unavailable stations don't retain misleading previews, and
normal deep links/player navigation still work. No framework migration is assumed.

### WEB-27 — Release evidence and rollback

Owner: Delivery + QA. This card accepts the selected release, not every P2 idea.
Collect the current test/build results, applicable integration evidence, public
policy links, canonical root/hosting target, prior deploy artifact and rollback
procedure. Check an HTTPS candidate with real stream policies, slow/offline
transitions, 200% zoom, keyboard/screen reader and supported devices. Validate
privacy copy against actual profile, browser-storage and notification behavior.

Done when: blockers and deferred features are explicit, each required result is
traceable, the candidate build is reproducible and publication is authorized under
the existing release process. Do not deploy simply to test a local change.

## Verification and change boundaries

For affected web implementation cards, use Node 22.13+ within Node 22 and run
`npm test`, `npm run lint`, `npm run typecheck`, and
`VITE_FIRESTORE_ROOT=HudHudDev npm run build` from `web_hudhud`, plus the relevant
browser journeys. Run `./tool/verify-governance.sh` and `git diff --check` from the
repository root. Add the existing Functions/Rules/profile-image/deletion gates
when those boundaries change, following the
[quality contract](../contracts/quality-release-contract.md). Record commands
actually executed; an older handoff's successful run is historical evidence.

Keep commits scoped by card. Reverting a UI card must preserve current callable
and stored-data contracts. Schema, routing, worker/cache lifecycle and new
personal-write decisions must be recorded before implementation. A worker update
also needs an explicit cache/version rollback strategy. No dependency addition,
backend migration, bulk write, new provider or production publishing is assumed.

Defer additional social providers, English localization, dark mode, analytics,
personalization and paid features until the preceding journeys are accepted and
there is a concrete user need. This plan does not introduce invented engagement
metrics, phone authentication, a second frontend or an admin redesign.
