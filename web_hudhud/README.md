# HudHud FM Public Web

The public landing page lives beside `web_admin` and reads active stations only
from Firestore. It uses the same Firebase Web SDK environment values as the
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
