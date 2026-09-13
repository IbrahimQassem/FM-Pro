# Public web development completion handoff

Updated: 2026-09-13. [Roadmap](public-web-development-plan.md).
[Account/discovery decision](../decisions/0004-public-web-accounts-and-discovery.md).

## Summary and completion rate

The original three-phase baseline (WEB-01–13) is implemented. Follow-up theme,
Google sign-in and profile work (WEB-14–16) is also implemented locally. See the
roadmap for proposed WEB-17–27; those cards have not been executed. End-to-end
device/integration acceptance remains incomplete:
real Firebase/provider/push configuration, real streams, Safari, native 200% zoom,
screen-reader testing and the iOS store destination remain external evidence.
No production data, real messages, deployment, signing or release was performed.

## Delivered behavior

- One player survives SPA station navigation and handles live/episode sources.
  Old events/rejections are ignored, source attempts time out after 20 seconds,
  and one distinct backup is tried. Episode pause/resume retains the same source;
  only successful playback updates browser history.
- Station links resolve active canonical catalog IDs; hidden/deleting/mismatched
  programs and unpublished episodes are omitted. Details include descriptions,
  program episodes and ISO-weekday schedules with explicit UTC offsets. Content
  reads cache first, refreshes from server, and retains valid cache on server
  failure. Unknown content gets unavailable/retry states without autoplay.
- Favorites retain at most 100 station IDs; existing recent history remains
  bounded at 30. Favorites tolerate corrupt/disabled storage; recently played
  sorts by recency and can be cleared. Favorites and account follows are distinct.
- Query URLs preserve one player and support Back/Forward. Title, description,
  canonical and Open Graph text update from canonical station data. Sharing never
  reveals audio URLs. Android/policy/deletion destinations reuse existing owners;
  iOS is omitted until its real numeric ID exists.
- Account UI loads when explicitly opened. Email/password registration uses the
  existing server OTP workflow. Google popup sign-in preserves that verification
  gate. Verified active profiles can edit their name/photo and follow stations.
  Reset and deletion call existing boundaries; deletion requires explicit
  confirmation and password or linked Google reauthentication. Other provider-only
  accounts use the app's provider reauthentication/deletion flow.
- The account repository owns one generation-guarded subscription listener, resets
  on Auth/verification changes, and cancels on disposal. All personal mutations
  use existing callable contracts; no direct client writes or backend contract
  changes were added. Canonical follow preferences override legacy duplicates.
- New/refollowed stations start with alerts off. Browser permission and each
  station's preference are separate controls. Missing browser support/VAPID leaves
  following usable. The bundled worker allowlists version/root/content IDs before
  opening a page, never plays automatically, and lets FCM display its notification
  once. Foreground notifications are bounded to 20 in-memory entries.
- Device registration reconciles on account entry/foreground; rotation unregisters
  the previous transient token. Sign-out waits for cleanup; failure remains
  recoverable. The app persists only an opt-in boolean, never a token or UID.
  If restart/revoked permission prevents recovery of the transient token, SDK
  deletion invalidates delivery and unreachable ownership records expire under
  ADR 0003; account deletion still removes device records in both roots.
- Optional feature failures have a local error boundary, preserving guest browsing
  and playback. Secondary text on light cards was darkened; controls/focus, RTL,
  wrapping, explicit loading/error states and reduced-motion styles are retained.

## Original baseline verification (historical)

Node **22.23.2** from `/tmp/hudhud-public-node22`; global Node remains unchanged.

| Command / gate | Result |
| --- | --- |
| `npm test` in `web_hudhud` | 22 tests passed |
| `npm run lint`, `npm run typecheck` in `web_hudhud` | Passed |
| `VITE_FIRESTORE_ROOT=HudHudDev npm run build` with explicit synthetic Firebase configuration | Passed; no real Firebase connectivity claimed |
| Functions `npm run lint`, `npm test` | Passed; 13 tests |
| Root `npm run emulators:test` | Passed; 25 rules tests |
| Root `npm run emulators:subscriptions` | Passed; 7 tests |
| Root `npm run emulators:account-deletion` | Passed; 3 tests |
| Root `npm run emulators:email-verification` | Passed; 10 tests |
| `./tool/verify-governance.sh`, `git diff --check` | Passed |

The initial attempt used the absent temporary Node path and fell through to Node
26: the test runner rejected its transform flag. Restored Node 22 and reran the
checks successfully. Emulator ports initially failed under sandbox restrictions;
reran the existing demo-only scripts with approved local-port access. A syntax
error in the expanded synthetic fixture and a generic snapshot type error were
fixed before final checks. No backend code was modified.

### Browser evidence

Chrome at 360×800 and 1280×900, with in-session screenshots and DOM/AX inspection:

- Station details, programs/episodes, schedule day selection and missing episode
  fallback; no autoplay. Shared player dock survives station-to-catalog navigation.
- Favorites toggle and persist across reload, local favorite filter, menu Escape
  recovery. New surfaces measured without horizontal overflow; visible production
  buttons were at least 44×44 at the tested narrow width.
- Delayed catalog response completed after the newer catalog; the three newer
  stations remained visible. SDK failed-initialization retry has a separate test.
- Synthetic verified, guest, unverified and disabled account states; follow defaults
  off, failed write leaves no saved follow, deletion confirmation/cancel, sign-out
  clears account display, unsupported push remains disabled. No real account
  creation/deletion, email, permission prompt or notification was exercised.
- Keyboard Tab moves from the account heading to the labeled verification field.
  Native zoom shortcuts did not establish a changed zoom level through the tool;
  200% native zoom remains unverified. AX labels are not a screen-reader test.

Screenshots are in-session evidence, not an exported screenshot archive. The
explicit `/test/preview.html` fixture is excluded from the production entry.

## Theme and account follow-up evidence

Recorded during the subsequent implementation sessions on 2026-09-13:

- App burgundy/blush tokens and bundled brand/mascot assets applied to the public
  site; assets were compared with the app sources. Existing RTL behavior retained.
- Account hub separates guest login/registration and profile management. Native
  profile dialog supports name edits, four app avatars and camera/file selection;
  local JPEG preparation precedes the existing server-mediated save.
- `npm test`: 34 web tests passed, including Google cancellation, verification
  gates, late account results, profile validation and deletion ordering/failures.
- Lint, TypeScript, explicit HudHudDev build, governance and diff checks passed.
  `node --test functions/test/profile-images.test.js`: 2 existing image tests passed.
  These do not mean the full emulator suite was rerun for the follow-up.
- Chrome synthetic browser checks covered Google success/blocked feedback,
  profile save/cancel/failed draft, valid JPEG preview, rejected image, avatar
  rendering, native dialog focus/Escape and 390px/320px overflow checks.
  Google-only deletion exposed reauthentication confirmation without a password.
- The real local entry opened at the account hub. No real OAuth consent, server
  photo round trip, device camera capture or real account deletion was completed.
- No new runtime dependency, Firebase write contract, deployment or release.
  Node VM modules are enabled only in the test runner for SDK-boundary stubs.

This evidence is carried forward, not freshly rerun by the roadmap-only update.
The next work and acceptance criteria live in the
[updated roadmap](public-web-development-plan.md#recommended-next-iteration).

## Performance and improvement areas

At the original baseline, the earlier single bundle was about 690kB minified (208kB gzip). Splitting optional
account/details from initial UI produces a roughly 255kB main bundle and a roughly
457kB shared Firebase chunk needed for catalog loading, plus a roughly 129kB account
chunk, 6kB details chunk and 104kB service worker. This defers account/worker code;
it is not a claim of a comparable reduction in total catalog bytes. The final
build has no oversized-chunk warning. See the build output for exact sizes.

The original synthetic Vite development fixture first-frame sample was 398ms (427ms in a
second view). This includes development/runtime/browser variability and is not a
production catalog/network benchmark. No indexes, paging, persistent catalog cache
or extra data subscriptions were introduced to optimize unmeasured read costs.

Remaining acceptance requires native/mobile browser playback and accessibility,
configured push receipt, iOS store ID, performance/read volume and crawler metadata
evidence. The roadmap now also proposes navigation/player improvements and later
favorites, comments and installable-web work; none is marked delivered here.
Live HTTP streams remain subject to HTTPS mixed-content restrictions.

## Files

- `web_hudhud/public-home.tsx`, `station-detail.tsx`, `account-panel.tsx`,
  `feature-boundary.tsx`, `styles.css`, `notification-worker.ts`, `vite.config.ts`.
- `web_hudhud/lib/{radio-player,stations,station-repository,firebase-client,
  discovery,content-repository,account-repository,browser-alerts,device-registration}.ts`.
- `web_hudhud/test/{preview.tsx,radio-player.test.mjs,discovery.test.mjs,
  firebase-client.test.mjs,device-registration.test.mjs}`.
- Public README/AGENTS, docs index, roadmap/handoff and ADR 0004.

The account follow-up also includes `profile-avatar.tsx`, `profile-editor.tsx`,
`lib/account-profile.ts`, `lib/profile-photo.ts`, account regression tests and
the test-only flag in `package.json`.

No new runtime package dependency, direct personal write, Function/Rules contract change,
privileged credential, release or deployment was added.
