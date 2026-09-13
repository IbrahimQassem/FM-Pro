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
