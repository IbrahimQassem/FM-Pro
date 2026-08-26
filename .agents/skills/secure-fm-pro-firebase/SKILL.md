---
name: secure-fm-pro-firebase
description: Refactor or secure FM-Pro Firebase data access, schema use, roles, rules, comments, storage, or migrations without granting trust to the client.
---

# Secure FM-Pro Firebase

Read `AGENTS.md`, both Firebase/data and security/privacy contracts, and
`.agents/roles/firebase-security.md`.

1. Identify the exact flavor root, collection/document path, fields, reader,
   writer, auth state, owner/admin rule, and current UI callers.
2. Centralize the operation behind a repository/data source and map Firebase DTOs
   to validated domain models. Never use `null` as an error state.
3. Make server rules deny by default. Test listener, signed-in user, owner, admin,
   invalid data, and denied writes with the emulator where rules are available.
4. Treat local roles as presentation hints only. Do not ship Admin SDK credentials
   or service accounts in the app.
5. For schema changes use expand/migrate/contract with dry-run, counts, resumable
   execution, rollback, and an explicit retirement point for compatibility reads.
6. Scan the diff for tokens, PII logs, broad permissions, and exported components.

Do not read secrets into output or mutate production Firebase without explicit
authorization separate from a code-change request.
