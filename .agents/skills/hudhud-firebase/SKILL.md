---
name: hudhud-firebase
description: Change or verify HudHud Firebase Functions, Firestore rules, data mappings, auth, moderation or seed tools with emulator evidence and preserved root boundaries.
---

# HudHud Firebase workflow

Read AGENTS.md, docs/README.md, firebase-data-contract.md and
security-privacy-contract.md under docs/contracts. Read the feature contract and
release boundary decision when account, UGC, notifications or root behavior changes.

1. Trace the app/admin caller, domain/data boundary, schema, Rules and existing tests.
2. Keep HudHudDev and HudHudOfficial explicit; Auth is shared. Preserve server-side
   verification, counter integrity, minimum user projections and atomic moderation.
3. Write meaningful allow/deny and retry/concurrency cases for changed writes.
4. Run Functions lint/tests when affected; run root emulator scripts for Rules,
   account deletion or email verification as appropriate. Use demo emulator projects.
5. For seeds, inspect tool/firebase_seed/README.md and its existing dry-run behavior.
   Separate any live apply from validation, using the session's existing authorization.
6. Report commands/results and service-side limitations. Never output secrets,
   Firebase configuration, OTP material, account data or raw request payloads.

Use Node 22 satisfying all package engine constraints. Do not use an unrestricted
Firebase MCP connection just to obtain documentation; existing CLI and emulator
workflows suffice. Production deploys and messaging are not setup/test operations.
