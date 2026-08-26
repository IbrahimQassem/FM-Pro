---
name: retire-fm-pro-debt
description: Remove proven dead code or retire a bounded FM-Pro technical-debt item using caller evidence, behavior protection, safe deletion, and build verification.
---

# Retire FM-Pro debt

Read `AGENTS.md`, `docs/roadmap/technical-debt-register.md`, the relevant contract,
and `.agents/roles/android-modernization.md`.

1. Select one debt ID. Reconfirm its evidence; do not trust an old line number.
2. For deletion, search Java/Kotlin, XML, resources, Manifest, Gradle, reflection,
   serialization names, deep links, flavors, tests, and generated bindings.
3. Add characterization coverage before changing behavior. For truly inert files
   made entirely of comments, caller proof plus affected builds is sufficient.
4. Delete code instead of commenting it. Remove associated resources and
   dependencies only when their complete usage set is empty.
5. Build/test affected flavors and run `./tools/verify-governance.sh`.
6. Mark the debt `done` only with evidence. If scope expands, stop and split a new
   debt item rather than combining unrelated cleanup.

Do not bundle cosmetic rewrites with deletion. Git holds history; source files do
not need archival copies.
