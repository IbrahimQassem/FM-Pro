# Admin web instructions

Read the root AGENTS.md, this directory's README, and the relevant contracts in
`../docs/contracts/`. The actual app is `web_admin`, built with React, TypeScript,
Vite and existing UI components; Flutter Riverpod/ARB rules do not apply here.

- Preserve `admin=true` authorization, explicit Firestore root selection, bounded
  collection-group queries, atomic relationship counters and moderation records.
- Preserve `/account-deletion`, `/community-guidelines`, `/privacy`, `/terms` and
  the public deletion session's isolation from admin authentication.
- Keep user projections read-only and deletion in its existing callable workflow.
- Inspect existing helpers before adding data access. Do not use a loaded list as
  proof that no dependent records exist. Avoid unsupported app controls.
- Keep Arabic RTL, keyboard access, responsive states and brand consistency.
- Use `../docs/roadmap/admin-web-redesign-plan.md` for proposed redesign slices;
  verify actual source/contracts before treating a proposal as current behavior.

Use Node 22 meeting package.json's minimum. Run `npm run test`, `npm run lint`,
and `VITE_FIRESTORE_ROOT=HudHudDev npm run build` for affected web changes.
Changed writes/Rules also need root emulator checks. Build is not deployment.

