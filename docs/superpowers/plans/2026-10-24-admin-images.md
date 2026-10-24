# Admin image file or link

User outcome: all admin image fields support a file picker and a pasted network
URL without changing the existing saved URL contracts. Applies to station logo/
thumbnail, program/episode artwork, banners, campaign creative and notifications.
No changes to unrelated URL fields, audio uploads or listener avatars.

Use one ImageField with existing Button/Input/tokens, Arabic RTL, named mode
buttons, visible file/size instructions, preview and explicit loading/error/retry/
cancel-wait states. Save/send waits for upload; late results cannot replace a newer
file/link/draft. Existing URL values remain editable and survive failures.

Storage remains server-only. New authenticated adminUploadImage callable checks
admin claim/role/root/field and actual current/destination station relationships.
JPEG/PNG/WebP <=2MiB and16MP; reject animation/SVG/malformed base64; strip metadata,
retain transparency, resize inside1600 and encode WebP using existing sharp.
Notifications use JPEG with a white background for cross-platform FCM support.
Hard output budgets: thumbnail48KiB, logo64KiB, other images160KiB; adaptive
quality/dimensions may reduce the maximum edge further. Pasted links are unchanged.
Private per-root quota and idempotent operation key prevent duplicate retries.
Uploads create reusable public editorial assets, independently of saving a form;
removing a field/cancelling a draft never deletes an asset used elsewhere.
Failed/interrupted uploads have bounded scheduled cleanup; ready assets are
retained. No new dependencies or direct client Storage permissions.

1. RED server decoding/auth/retry/cleanup and client validation tests.
2. Implement callable/core and demo emulator coverage (Auth/Firestore/Storage).
3. Implement shared component and integrate all image-bearing forms; gate submit
   while busy; preserve unrelated inputs and invalidate stale completions.
4. Run Node22 unit/lint/typecheck/build/emulators, synthetic browser file/link/
   invalid/error/retry/cancel/narrow/keyboard checks; update contracts/progress.
No commit, reset, deployment, production uploads or real notification send.

Ruling: implement the explicitly requested file/link workflow directly; no extra
approval round for routine implementation choices. Existing product/security
contracts override generic skill approval or redesign suggestions.

Completed locally: all four implementation/verification steps. Functions152,
admin76, native editorial41, callable17, Rules33 and profile3 tests passed;
the17 emulator cases skipped by the ordinary admin suite ran in the callable
suite. Lint, typecheck, build, governance and strict UI audit passed. Browser
fixture covered retry/stale responses, keyboard,390px and200% text. Deployment
remains a separate release step; see WORK_PROGRESS for logs and limitations.
