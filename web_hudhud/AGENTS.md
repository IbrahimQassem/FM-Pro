# Public web instructions

Read the root AGENTS.md and this directory's README. Preserve React/TypeScript/
Vite conventions and the public read-only station experience.

- Read active stations from the explicitly selected canonical Firestore root.
  Do not introduce fake station fallback, admin credentials or privileged writes.
- Keep public navigation, Arabic RTL, responsive layout and accessible controls.
- Reuse existing Firebase helpers and theme conventions; inspect before adding
  dependencies. Keep public/admin hosting targets separate.
- Use Node 22 meeting package.json's minimum. Run `npm run lint` and
  `VITE_FIRESTORE_ROOT=HudHudDev npm run build` for affected changes.
  There is no current `npm test` script; use browser checks for relevant journeys.
- Production publishing follows the existing release authorization; never deploy
  merely to test a local change.

