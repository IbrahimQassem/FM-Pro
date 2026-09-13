# Public web development plan

Updated: 2026-09-13. Target: `web_hudhud`. Release and deployment excluded.

The request to complete the whole plan selects all three phases, including
optional accounts and browser alerts. [ADR 0004](../decisions/0004-public-web-accounts-and-discovery.md)
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
| WEB-11 | 3 | Optional email/password Auth, server OTP/profile calls, name editing, password reset, recent-auth deletion | Existing Functions, verification/deletion emulator gates; synthetic account UI |
| WEB-12 | 3 | Account-bound station follows, canonical legacy resolution, unavailable references, separate station alert opt-in | Resolution tests, browser follow/failure cases, subscription and rules emulator gates |
| WEB-13 | 3 | Bundled browser worker, VAPID/capability gating, device registration/rotation/cleanup, foreground list, allowlisted notification navigation | Device lifecycle/route tests, bundled worker build, unavailable-push UI; real receipt remains external |

**Development coverage: 13/13 cards implemented (100%).** This measures code
coverage of the development roadmap, not full device/integration acceptance.
All three phases have shipped to the local working tree. Nothing has been deployed.

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
verified, and release/deployment are not part of the completion percentage.
