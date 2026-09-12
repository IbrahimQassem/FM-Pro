# Public web development plan

Date: 2026-09-12. Target: `web_hudhud`. No deployment or app release.

## Goal and boundaries

Make discovery and listening reliable on mobile and desktop, then expand useful
public content. Preserve React/TypeScript/Vite, Arabic RTL, the current identity,
and the explicitly selected Firestore root. No admin credentials, privileged
writes, fabricated station fallback, or new router/state library.

The trailing “3” in the request is not yet clarified. Start the common Phase 1
work now; Phase 3 remains conditional rather than silently enabling accounts.

## Phase 1 — Reliable listening and usable controls (active)

| Card | Implementation | Acceptance |
| --- | --- | --- |
| WEB-01 | Extract media lifecycle; isolate source attempts and release old audio | Switching A→B, stale rejection/events, stop/dispose, invalid URL and single backup fallback tests |
| WEB-02 | Connecting/playing/paused/error states with retry; remember successful plays only | No autoplay; denied browser play can be retried; duplicate clicks/history suppressed |
| WEB-03 | Guard catalog requests and retry failed Firebase initialization | Stale responses ignored; malformed unnamed records skipped; obsolete city filter reset |
| WEB-04 | Mobile text, 44px controls, keyboard focus, menu/filter semantics, reduced motion | Narrow/desktop browser checks, keyboard navigation and screenshots; no horizontal overflow |
| WEB-05 | Label local recency honestly; preserve existing local history format | Latest available history item chosen, featured/default fallback when history is empty |
| WEB-06 | Add Node regression tests and TypeScript build gate | Tests, lint, typecheck, explicit HudHudDev build; record browser evidence separately |

Do not change HTTP stream acceptance in this pass; document mixed-content/browser
limitations. Do not claim successful real streaming from media fakes.

## Phase 2 — Discovery and return visits (queued)

- Add read-only station detail pages with canonical descriptions, programs,
  published episodes and schedules. Use existing IDs and contracts; hidden or
  removed content gets an unavailable state. Preserve one shared player.
- Add browser-local favorites, recently played, and a clear-history action.
  Store bounded IDs only; tolerate unavailable storage and missing stations.
- Add stable shareable station URLs and page metadata. Confirm the actual public
  hostname and store destinations from owning configuration before wiring links.
- Measure catalog loading and device rendering before proposing paging/index
  changes. A local timing sample is not a production latency/read-cost result.

## Phase 3 — Account integration (conditional)

If selected, first document the transition from read-only public web to optional
Firebase Auth accounts. Reuse existing verified-account, profile, deletion and
station-subscription callable contracts; guest discovery/listening remains free
of sign-in gates. Follow and alerts remain separate actions, default alerts off.

Browser push requires its own service-worker, permission, supported-browser and
device-registration lifecycle design. Reuse server ownership/cleanup invariants;
do not copy mobile setup or promise delivery without browser evidence. Verify
both allowed roots and owner/guest/disabled-account cases in emulator tests.
No account integration or push deployment is implied by completing Phase 1.

## Completion and evidence

Track completed, partial and pending cards in the implementation handoff. Count a
card complete only with its listed evidence; keep browser/device limits explicit.
No percentage for the entire three-phase roadmap is asserted before Phase 3 scope
is settled. Phase 2/3 are future implementation work, not delivered features.

## First implementation checkpoint

The first Phase 1 slice is delivered. See the [handoff](public-web-development-handoff.md)
for actual checks, partially verified requirements, and remaining work. Phase 2
and Phase 3 are not marked implemented.
