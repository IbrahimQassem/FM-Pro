# HudHud FM Public Web

The public landing page lives beside `admin_web` and reads active stations only
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
VITE_FIRESTORE_ROOT=HudHudOfficial npm run --prefix public_web build
firebase deploy --only hosting:hudhud_public
```
