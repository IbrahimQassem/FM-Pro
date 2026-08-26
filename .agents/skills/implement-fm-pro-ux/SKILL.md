---
name: implement-fm-pro-ux
description: Implement or refine an FM-Pro Android screen or flow using the Arabic RTL product contract, Material 3 tokens, accessibility, and explicit UI states.
---

# Implement FM-Pro UX

Read `AGENTS.md`, `docs/contracts/product-ux-contract.md`, the architecture
contract, and `.agents/roles/product-ux.md`.

1. Capture the current flow and list its loading, content, empty, offline, and
   error states before editing.
2. State the primary task and hierarchy. Listening and now-playing controls take
   precedence over banners or secondary content.
3. Reuse Material tokens and shared state components. Put all visible strings in
   localized resources and format days/dates through Locale.
4. Keep business and Firebase logic outside the screen. Report missing/invalid
   data as a contract gap; do not hide it with arbitrary placeholder values.
5. Verify RTL, TalkBack focus/labels, 48dp targets, contrast, 200% font, image
   failure, small phone, and the affected navigation/back behavior.
6. Provide before/after screenshots and tests. Delete obsolete layout/drawable
   resources after proving no references.

Admin controls must remain outside the listener navigation and require server-side
authorization even if this task only changes visibility.
