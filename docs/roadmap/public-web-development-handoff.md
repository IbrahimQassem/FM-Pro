# Public web development — first implementation

Date: 2026-09-12. [Roadmap](public-web-development-plan.md).

## Delivered

- Extracted the media lifecycle into a testable controller with one active source.
  Old events/rejections cannot change a replacement station. Invalid sources stop
  previous audio; one backup attempt is allowed; stop/dispose releases resources.
- Added connecting/playing/paused/error feedback and retry after browser play
  denial. History is updated only after playback starts and once per source.
- Extracted station mapping and Firestore reads; catalog requests reject stale
  completions, reset unavailable city filters, and ignore unnamed records. Failed
  Firebase initialization can be retried rather than caching a rejected promise.
- Replaced frequency-based recommendation claims with honest local recency.
- Improved mobile text, naturally sized featured cards, wrapping titles, player
  clearance, 44px buttons, focus outlines, menu Escape/focus handling, pressed
  filter semantics, and reduced-motion styles. Existing visual identity retained.
- Added TypeScript as a build gate, a Node test script, a dependency lockfile,
  and an explicit synthetic browser fixture excluded from the production bundle.

## Verification

- Node 22.23.2 used from a temporary install; global Node unchanged.
- 10 Node tests pass: playback races, invalid sources, fallback, stop/dispose,
  duplicate attempts/events, browser denial, buffering, mapping, ordering, recency.
- TypeScript and oxlint pass; development-target Vite build passes.
- Build used `HudHudDev` with explicit synthetic Firebase configuration because
  local Firebase environment values were absent. This validates compilation, not
  live Firebase connectivity. No deployment or real data writes were performed.
- Chrome synthetic browser checks: 360×800 and 1280×900, before/after screenshots
  visually inspected in-session, long Arabic titles, menu open/Escape, search
  no-results/reset, city filtering, invalid-stream error/close, error/retry and
  empty catalog. Narrow page width stayed at 360px; all visible buttons measured
  at least 44×44 after the final control-size correction.
- Screenshots are in-session evidence; no exported screenshot archive is claimed.
- Governance and Git whitespace checks pass. No Flutter/backend code changed.

## Progress and next work

| Card | Status | Remaining evidence |
| --- | --- | --- |
| WEB-01 media isolation | Verified with fake media | Real browser streams and Safari interruptions |
| WEB-02 playback feedback | Verified locally | Real autoplay-policy/device behavior |
| WEB-03 catalog ordering/recovery | Implemented; partially verified | Delayed overlapping catalog and SDK initialization fault tests |
| WEB-04 usability/accessibility | Verified for tested Chrome views | 200% zoom, screen readers, broader contrast and mobile Safari review |
| WEB-05 honest recency | Verified in unit tests | Clear-history UI belongs to Phase 2 |
| WEB-06 quality gates | Verified locally | Real Firebase integration configuration |

Phase 1 development has started and its first slice is delivered. Phase 2
(station pages, local favorites, sharing/metadata) is queued. Phase 3 accounts and
browser push remain conditional while the request's trailing “3” is unconfirmed.
No overall roadmap completion percentage is asserted from these local checks.

The build warns about the approximately 690kB minified JavaScript bundle
(208kB gzip). Investigate lazy Firebase loading and measure actual loading before
changing chunking; do not hide the warning. HTTP radio streams remain subject to
HTTPS mixed-content restrictions. No claim of real streaming or push delivery.

## Files

- `web_hudhud/public-home.tsx`, `styles.css`, `package.json`, `package-lock.json`.
- `web_hudhud/lib/radio-player.ts`, `stations.ts`, `station-repository.ts`,
  `firebase-client.ts`.
- `web_hudhud/test/radio-player.test.mjs`, `stations.test.mjs`, `preview.html`,
  `preview.tsx`.
- Public README/AGENTS verification instructions, docs index, roadmap and handoff.

No new application dependency was added. Existing declared dependencies were
installed and locked. Fixtures never replace failed real catalog reads.
