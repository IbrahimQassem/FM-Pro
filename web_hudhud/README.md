# HudHud FM Public Web

The public landing page lives beside `web_admin` and reads active stations and visible station content
from Firestore. Optional account flows reuse existing Firebase callables; guest
browsing/listening remains read-only. It uses the same Firebase Web SDK environment values as the
existing admin project; no admin credentials or service-account keys are read.

The Firestore root is selected at build time:

```bash
VITE_FIRESTORE_ROOT=HudHudDev npm run dev
VITE_FIRESTORE_ROOT=HudHudOfficial npm run build
```

During local development the root defaults to `HudHudDev`. Production builds
must select `HudHudDev` or `HudHudOfficial` explicitly. The app reads
`{root}/stations/stations`, filters `isActive === true`, and never seeds or
falls back to static station data.

Firebase Hosting target `hudhud_public` is linked to the `sanadev-fm` site.
From the project root, build and deploy it with:

```bash
VITE_FIRESTORE_ROOT=HudHudOfficial npm run --prefix web_hudhud build
firebase deploy --only hosting:hudhud_public
```

## Development checks

Use Node 22.13+ within Node 22. Run `npm test`, `npm run lint`, and
`npm run typecheck`. `npm run build` now includes the TypeScript gate; select
`VITE_FIRESTORE_ROOT=HudHudDev` for a development verification build.

`test/preview.html` is an explicit synthetic browser fixture served by Vite in
development (not included in the production entry bundle). It injects catalog
data only for UI checks; the real app never substitutes fixture stations.
`?state=empty` and `?state=error` exercise alternate states without Firebase reads.

The implementation roadmap is [the public-web development plan](../docs/roadmap/public-web-development-plan.md).

## Accounts, discovery and browser alerts

The complete three-phase development scope and remaining external checks are in
[the handoff](../docs/roadmap/public-web-development-handoff.md) and
[ADR 0004](../docs/decisions/0004-public-web-accounts-and-discovery.md).

Station URLs use `?station=<canonical ID>` with optional `program`/`episode` IDs.
The player remains shared across internal navigation. Browser favorites/history
are independent of account follows. Account navigation loads email/password Auth
with session persistence; verification/profile/follow/deletion use existing
server callables in the explicitly selected root. Auth deletion spans both roots.

Browser push needs the public `VITE_FIREBASE_VAPID_KEY` in the existing build
configuration and an HTTPS supported browser, plus the existing backend functions
and provider/authorized-domain configuration. No permission prompt runs at startup.
A new station follow has alerts off; opt into the browser and then each station.
Normal sign-out waits for device cleanup. The service worker is bundled through
Vite's worker entry and deployed only as part of an independently authorized site
publication. No CDN script dependency or raw token persistence was added.

Firebase's official [web client setup](https://firebase.google.com/docs/cloud-messaging/web/get-started)
and [message handling](https://firebase.google.com/docs/cloud-messaging/web/receive-messages)
describe VAPID, service-worker and supported-browser prerequisites. A successful
build does not prove device receipt.

The fixture also supports `state=guest`, `unverified`, `disabled`, `write-error`,
`content-error`, `offline`, and `race`. Account/content behavior is explicitly
injected and entirely synthetic. The race fixture completes an older empty
catalog after a newer populated catalog. It never replaces real production reads.

## App theme and assets

`styles.css` mirrors the brand colors in `lib/core/theme/app_colors.dart` and the
card/input/chip radii in `lib/core/theme/app_theme.dart`. Keep these tokens aligned
when the app brand changes. The existing Arabic font and RTL navigation remain.

`public/assets/images` contains copies of the app assets. The site uses the app
icon for branding and the favicon, the onboarding mascot for the welcome section,
and the search/favorites/offline/default-avatar mascots in their matching states.
Keep the web copies synchronized with the source files in `assets/images`;
decorative images supplement readable text and stay outside player controls.

## Google sign-in and account profiles

Open **حسابي ومحطاتي** to use Google or the separate email login, registration and
password-reset views. The listener card opens **إدارة بيانات الحساب**, with
verification status, provider badges and a profile editor for names, four app
mascots, or camera/file photos. Cancel discards the draft. Photos are processed
in memory and uploaded only on Save through the existing profile callable.

Firebase Auth must have Google enabled and the site's hostname authorized. Local
`localhost`/`127.0.0.1` domains also need authorization for real OAuth testing.
See [Firebase's Google sign-in setup](https://firebase.google.com/docs/auth/web/google-signin).
This change does not modify provider/hosting configuration or publish the site.
Browser session persistence and server email verification remain unchanged.

Google-only deletion opens a Google reauthentication popup before cleaning up
browser alerts and calling the existing deletion endpoint. Password accounts
retain password reauthentication. Failure keeps the account available to retry.

The local fixture adds `state=google`, `google-cancel`, `google-blocked`,
`google-conflict`, `missing-email` and `profile-error` (append `#account`).
`state=guest#account` simulates successful Google login and profile editing.
These fixtures never sign in real users or upload to Firebase. The repository
tests compile the real TypeScript against isolated SDK stubs using Node VM modules;
`npm test` enables the required test-only Node flag. Real Google consent,
camera capture on a device and server photo round trips remain live smoke checks.
