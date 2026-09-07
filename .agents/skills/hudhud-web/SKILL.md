---
name: hudhud-web
description: Implement or review HudHud web_admin and web_hudhud React interfaces, guided admin workflows, public pages, RTL themes and Firebase read/write boundaries.
---

# HudHud web workflow

Locate the repository and read root plus target AGENTS.md and the target README.
Use docs/roadmap/admin-web-redesign-plan.md for admin redesign scope only; it is
a proposal, not proof that a backend capability exists.

1. Inspect package.json, entry point, existing UI components, data helpers and tests.
2. Preserve React/TypeScript/Vite and target-specific conventions. Do not introduce
   Flutter state patterns or a new router/state dependency just for appearance.
3. Map changes to app fields and actual capabilities. Preserve public policy and
   account-deletion routes, admin claims, selected-root checks and session isolation.
4. Use guided validation and explicit async states. Verify Arabic RTL, keyboard,
   narrow screens and theme contrast with browser evidence when UI changes.
5. Run target lint/build and existing tests. Select VITE_FIRESTORE_ROOT explicitly
   for builds. Do not invent a public-web test command when none exists.
6. For data mutations, also use the Firebase workflow and emulator gates. Do not
   call deployment or send announcements as part of UI validation.

Reuse available Product Design skills for an actual visual audit or design exploration,
and fallow for a requested structural JS/TS review. Their availability is optional;
source inspection, existing CLI checks and browser tools remain the fallback.
