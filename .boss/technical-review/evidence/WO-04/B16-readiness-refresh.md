# B16 read-only readiness refresh

Status: **NOT STARTED; blocked by B15 native125 acceptance and serial integration of the approved native-receipt amendment.** Existing planning artifacts and task states remain unchanged. This attachment gives no RED/GREEN or acceptance credit.

## Approved proposal still applies

Archived proposal `B16-native-receipts-contract-proposal.patch` remains exactly SHA-256 `9ff895a5271c6c52a04ef158d38c55f9e7dd6e0a670c691e506a1a57e5929e3f`; its independent docs-only approval remains applicable. `git apply --check` passes against the current repository. Nothing was applied.

A read-only in-memory projection confirms the later count appendices are byte-identical in all three affected documents. Data/ADR projected hashes remain c64d950f/045e9f87. Operations is now d9dfc0f2 because B15 added its implementation handoff; applying the same reviewed hunk would produce fe7a31b3, not the historical e95703fe. I must apply the scoped patch, never overwrite current documents from an older full-file candidate. Only approved accepted-status/review-reference refinement is permitted at integration.

## Scope and first eligible RED

All existing notification sources/tests are present and match the previously reviewed fingerprints: program-notifications26f4485e, notification-delivery3d44097a, episode-alertsd33233b6 and user-managementd60d8148. Both proposed migration tool/test paths remain absent and registered; do not execute/import them as RED. The dependency graph remains87 nodes, acyclic, no unknowns;65 tasks/16 batches/17 waves/75 owners unchanged.

The first existing behavioral seam is `notifyUpcomingProgramsForRoot({firestore,messaging,root,now})`. After release, author permanent offset0 Monday10:00 cases with complete weekdays/start/end/offset, active non-deleting program and matching active station. At07:00Z current fixed-Aden code wrongly calls an in-memory mock send; at10:00Z it wrongly skips. No real provider is needed. Existing tests often omit the newly required offset; adapting those fixtures is compatibility work, not RED. Missing migration exports, compilation/environment failures and skipped cases never count.

Further existing seams are the program/station edit between pre-read and separate startDelivery transaction, loss of narrow programCompatibility during claim replacement, and collector deletion of raw program receipts through its unprefixed cleanupAt query. Preserve sent/unknown suppression, original carry clocks/backoff, same-local-day policy and shared sender defaults. No new generic protocol, dependency or collection is justified.

## Minimal locks and commands

I owns notification-delivery, operations documentation, Rules, Rules tests, editorial-comment-counts fixture and conditional index integration. BE may author the existing notifier/tests and registered migration tool/tests only after release. Keep T10→T11→T12 serial dependencies; no index.js/scheduler change is required. Episode-alert/broadcast callers remain unchanged and require regression coverage. Add an index only after the actual bounded broadcast query proves it necessary; current default-deny notificationOperations paths need role-matrix guard coverage.

Verified definitions only, **not executed**: exact Node22 PATH; cwd functions focused notifier/delivery tests, npm test and npm run lint; root migration tests only after authoring/import preflight; parent E-only emulators:test/editorial and applicable subscription/admin/account gates. Parent native125 session69693 is untouched.

No source/test creation, source/contract patch application, emulator/Flutter/provider send, production operation or task start occurred. Full fingerprints, presence inventory, appendix hashes and command definitions are in `/tmp/hudhud-b16-readiness-refresh.json`.
