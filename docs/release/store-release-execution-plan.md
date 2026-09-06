# HudHud FM — release execution plan and agent assignments

Created: 2026-09-06  
Status: implementation performed; local successes and remaining external gates are tracked below.  
Objective: resolve the release blockers, verify signed Android/iOS candidates, and complete the applicable store launch gates.

## Sources of truth

- [Readiness review](store-release-readiness-review-2026-09-06.md): dated findings R01–R11, baseline command results, device matrix, store requirements and rollout corrections.
- This file: task ownership, sequencing, current status and acceptance evidence. Update it as work progresses; preserve the review's historical results.
- [AGENTS.md](../../AGENTS.md), [role definitions](../../.agents/README.md) and [project contracts](../README.md): implementation constraints. This plan does not override them or turn a role into deployment authority.

Reproduce each finding against the current source before fixing it. A changed baseline may alter the implementation needed, but a finding is closed only with evidence. Preserve unrelated working-tree changes.

## Roles and agent responsibilities

Reuse the existing roles instead of introducing a second agent hierarchy. A role is an assignment for a bounded task, not a permanently running agent.

| Agent assignment | Existing role | Responsibility |
|---|---|---|
| Coordinator | [Delivery lead](../../.agents/roles/delivery-lead.md) | Own this tracker, decisions, task boundaries, dependencies and integration; accept work only after verification. |
| Backend implementer | [Firebase data/security](../../.agents/roles/firebase-data-security.md) | Environment consistency, account lifecycle, OTP, claims, Rules and emulator coverage. |
| Flutter/platform implementer | [Flutter architecture](../../.agents/roles/flutter-architecture.md) | Client integration, platform build/signing configuration, store URLs and profile/share flows. |
| Admin/community implementer | [Account/community/notifications](../../.agents/roles/account-community-notifications.md) | Admin environment routing, public deletion, moderation and notification integration, with Firebase contract review. |
| Product reviewer | [Product UX/accessibility](../../.agents/roles/product-ux-accessibility.md) | Launch scope, avatar/share decisions, legal journeys, branding, RTL and accessibility. |
| Audio implementer/reviewer | [Playback](../../.agents/roles/playback.md) | Safe playback breadcrumbs and device interruption/background acceptance. |
| Independent verifier | [Quality release](../../.agents/roles/quality-release.md) | Review diffs; run applicable gates; attach PASS/FAIL/NOT RUN evidence; issue platform-specific readiness decisions. |

The human release owner supplies or validates store account ownership, provider/production credentials through secure channels, content rights, legal approval and operational staffing. Agents prepare the concrete artifacts and checklists before requesting any missing decision or approval. Existing explicit authorization remains valid; do not request it again.

## Task board

Current status is recorded in the progress ledger below. Each assignment must select a smaller exact file set within the scope below before work starts. IDs refer to findings in the review; its acceptance criteria remain part of these tasks.

| Task | Findings / outcome | Owner | File scope | Depends on | Required completion evidence |
|---|---|---|---|---|---|
| T01 | Freeze launch scope and reconcile environment/governance decisions. | Coordinator + product reviewer | Relevant `docs/contracts/`, roadmap and this plan; governance references only where needed | None | Decision record: project versus root isolation, deletion semantics, first launch versus update, shipped providers, avatar/share scope; documented contract corrections. |
| T02 | R11: restore Android toolchain compatibility. | Flutter/platform | `android/`, `pubspec.yaml`, affected lockfiles | None | Root cause confirmed; debug build and affected tests pass; no disabled JVM compatibility checks. |
| T03 | R04: enforce OTP state, attempt limits and concurrency. | Backend | `functions/`, email-verification emulator tests | None | Lockout, reuse, concurrent verification and downstream-failure tests pass. |
| T04 | R02: align client/backend/admin environment selection. | Backend, then Flutter/admin handoffs | Root configuration and its consumers; Functions, admin resource paths, Rules/indexes and related tests | T01, T03 | Invalid release roots rejected; both allowed roots and isolation tested; end-to-end account/moderation routes agree. |
| T05 | R01: make deletion complete and environment-correct. | Backend | Account deletion Functions/client integration and emulator tests | T04 | Official data cleanup, shared-identity decision, counter accuracy, partial-failure retry and cross-root cases verified. |
| T06 | R03: enforce trusted email verification consistently. | Backend, then Flutter handoff | Auth Functions, Rules, account data/state and related tests | T04, T05 | Negative social/missing-email/linked-provider tests; UI and server reflect the same verified state. |
| T07 | R05/R06: release guards, capabilities and real store ID. | Flutter/platform | Android signing config, iOS capabilities/configuration, app/store URL configuration and tests | T01, T02, T04 | Fail-closed release config; URL tests; platform builds; live signing/provider evidence remains open until T13. |
| T08 | R07: usable external deletion for every shipped provider. | Admin/community | Public deletion page and auth integration, related tests | T05, T06 | Disposable-account deletion journeys, partial-failure messages and provider reauthentication verified. |
| T09 | R08/R09: safe sharing and durable approved avatars. | Flutter/platform + product reviewer | Share service, profile data/UI, localization and tests; Storage only if explicitly in approved scope | T01, T06, T07 | No raw source URL in sharing; avatar persistence follows chosen scope; restart/account-switch/second-device criteria covered. |
| T10 | R10: complete crash reporting and playback diagnostics. | Flutter/platform, then audio handoff | Firebase bootstrap, native build integration, player data layer and related tests | T02, T07, T09 | Safe breadcrumbs and symbols integration; controlled release-device crash evidence completed in T13. |
| T11 | R11: finish formatting, admin lint and failed UGC interaction test. | Flutter/admin implementers | Flagged Dart files/tests and admin lint/legal-page files | T03–T10 | Defect or test-visibility root cause explained; applicable format/lint/test gates green without weakened checks. |
| T12 | Independently certify local integration and prepare delivery artifacts. | Independent verifier + coordinator | Review-only source/test access; this plan and sanitized evidence | T01–T11 | All applicable contract checks pass on supported runtimes; deployment manifest, rollback package and reproducible candidate build instructions prepared. |
| T13 | Verify deployment, signed artifacts, devices and store submission package. | Release owner + verifier + audio/product reviewers | Approved environment, artifacts, evidence and store metadata | T12 | Review sections 4–5 and acceptance checklist fully evidenced on exact artifact hashes; no untested mandatory gate. |
| T14 | Execute approved launch and observe rollout health. | Release owner + coordinator | Approved store release and operational evidence | T13 | Platform-specific rollout/recovery decision, launch record and observation results under review section 7. |

T13 and T14 include external actions, so their execution must follow the applicable authorization and release gates. Their preparation can proceed earlier: draft metadata, identify missing credentials without exposing them, prepare device cases and collect content/legal decisions while code work continues.

## Scheduling and shared-file rules

1. Start with T01, T02 and T03 as bounded independent work when agent execution is authorized. Limit concurrency to the coordinator plus at most three workers, and use fewer when tasks share files.
2. Before assigning a worker, record task ID, actual agent/session, exact writable files and current baseline. No two workers may edit the same file. A task-table scope is a candidate scope, not an exclusive reservation until assigned.
3. Serialize backend tasks touching `functions/index.js` or `firestore.rules`. Split T04 into backend → client → admin handoffs, then verify the integration. Serialize platform tasks touching Gradle, Xcode, `pubspec.yaml` or lockfiles.
4. Route shared `app/providers.dart`, shared configuration, localization and contract changes through a coordinator-approved handoff. Release file reservations before another worker starts.
5. Run formatting cleanup after functional edits settle. Do not run competing Flutter/native builds or emulator suites against the same build directories/ports; the verifier owns the final command sequence.
6. The verifier reports issues back to the implementer. It does not silently modify implementation during independent review.

## Assignment template

```text
Task: <one Txx task or bounded subtask>
Baseline: <commit and relevant existing local changes>
Read: AGENTS.md, assigned role, relevant contracts, review finding(s).
Outcome: <one observable result>
Writable files: <exact reserved files>
Dependencies: <completed task IDs / decisions>
Mode and authority: <implementation or review; authorized action boundaries>
Acceptance: <finding criteria plus targeted regression cases>
Verification: <appropriate commands and device evidence, if applicable>
Return: changed files, cause/fix, actual command results, remaining risks,
        evidence references, and whether acceptance is met.
Do not expand scope or edit another worker's reserved files.
```

## Progress and evidence ledger

Use `TODO → IN PROGRESS → READY FOR REVIEW → VERIFIED` (`SUCCESS` in the ledger). A `SUCCESS — local` result closes the implemented/tested subtask only; the corresponding live proof stays open in T13. Use `BLOCKED` with a specific dependency, required input and next action. `VERIFIED` requires the independent reviewer to accept the task's evidence. Split local completion from live proof; never mark a live gate verified based on an emulator or simulator.

| Task | Status | Assigned agent / human | Baseline or artifact | Evidence / command results | Next action |
|---|---|---|---|---|---|
| Plan setup | SUCCESS | Coordinator | Review 2026-09-06 | Roles, bounded tasks and dependencies established. | Keep dated review as baseline. |
| T01 | SUCCESS — local decisions | Coordinator | ADR 0002 | Shared Auth/two-root deletion, trusted verification, bundled avatars and public sharing boundaries recorded; contracts/governance reconciled. | Store listing status and Apple ID remain T13 inputs. |
| T02 | SUCCESS | platform_build + independent reviewer | Android source changes | Debug APK built; JVM mismatch fixed; missing signing and Development release root correctly rejected. | Signed artifact inspection in T13. |
| T03 | SUCCESS — local security tests | security_boundary + independent reviewer | OTP candidate | Email emulator 10/10; atomic consume, lockout, concurrency and recoverable server proof. | Normal Node 22 runner rerun passes 10/10; live delivery remains T13. |
| T04 | SUCCESS — local isolation tests | Backend, admin and coordinator | Canonical root policy | Rules 23/23 including admin group bounds; admin explicit-root build and negative configuration tests; Flutter root guards. | Approved live environment smoke test in T13. |
| T05 | SUCCESS — local cleanup tests | Backend + independent reviewer | Deletion candidate | Deletion/scheduler 3/3; both roots, path collisions, stale-token barriers, retention cleanup and renewal protection tested. | Live disposable-account evidence in T13. |
| T06 | SUCCESS — local auth tests | Backend + coordinator + flutter_tests | Trusted Auth claim policy | Rules and account tests reject unverified social access; callable failures remain visible; no client provisioning fallback. | Live OAuth/missing-email tests in T13. |
| T07 | SUCCESS — local / BLOCKED — signing | Platform + coordinator | Android guards; iOS configuration | Android guards and six iOS preflight cases pass; entitlements/store-ID validation implemented; explicit Runner iOS 15 target regenerates Swift package correctly; simulator build passes. | Numeric Apple ID, signing/provisioning and signed artifact evidence missing. |
| T08 | SUCCESS — local web checks | admin_release + coordinator | Admin candidate | Node 22 lint, 4 tests and explicit Official-root build pass; provider revocation/partial-failure ordering covered. | Browser/provider deletion journeys in T13. |
| T09 | SUCCESS — local regression tests | Coordinator + flutter_tests | Share/profile candidate | English/Arabic shares exclude raw audio URLs; canonical profile saves, portable avatars and invalid-path rejection tested. | Second-device acceptance in T13. |
| T10 | SUCCESS — local / BLOCKED — live proof | Platform + coordinator | Crashlytics candidate | Android native integration builds; safe phase logs and sanitized fatal reporting; iOS symbols phase configured; simulator build passes. | Signed symbol upload and controlled release crashes remain T13. |
| T11 | SUCCESS — local gates | Coordinator + flutter_tests | Integrated Dart/admin candidate | Format clean; analyzer clean; full Flutter suite 129/129; admin lint clean. UGC test now scrolls, settles and asserts hit-testability. | Final Apple deletion guard included; no further local regression pending. |
| T12 | SUCCESS — local integration | Coordinator + independent reviewer | Integrated candidate | Fresh read-only review completed; deletion resurrection and missing Apple revocation code corrected. Final Flutter 129/129 and reproducible email 10/10 pass; admin lint/build and iOS simulator build pass; handoff prepared. | Complete signed-artifact and live verification under T13. |
| T13 | BLOCKED — external evidence | Release owner + verifier | No signed candidate | Android signing file absent; Apple ID/listing status, live provider, domain, legal/rights and physical-device proof not supplied/verified. | Complete [candidate handoff](release-candidate-handoff.md). |
| T14 | BLOCKED — release gates | Release owner | Not published | T13 is not complete; no upload, production mutation or public rollout performed. | Release only after the store-ready candidate is verified. |

Record actual completion dates and evidence links per task. Keep secrets, personal data and raw stream URLs out of evidence. If a required command cannot run, record `NOT RUN`, why, and who can supply the missing evidence. Reopen affected verified tasks when later changes invalidate their evidence.

## Goal completion

Track three milestones separately:

- **Local implementation verified:** T01–T12 accepted; this does not authorize or certify public release.
- **Store-ready candidate:** T13 accepted; signed artifacts, real-device results, operational readiness and submission package verified, with all mandatory review checklist items closed.
- **Live release completed:** T14 accepted; authorized store release performed and its observation gate passed.

Current milestone: **local implementation and automated integration checks verified; signed/store/live gates remain open**.
The implementation agents ran as bounded assignments, not persistent services.
No local success is a claim that the application has been published or approved by a store.

## Verification snapshot — 2026-09-06

Results below describe the local working tree, not a signed store artifact.
Logs under `/tmp` are local diagnostic evidence and may be removed by the OS.

| Check | Result | Evidence / reproduction |
|---|---|---|
| Dart formatting | SUCCESS: 144 files, zero changes | `dart format --output=none --set-exit-if-changed lib test`; `/tmp/hudhud-final-format-check.log` |
| Flutter analysis | SUCCESS: no issues | `flutter analyze`; `/tmp/hudhud-final-analyze.log` |
| Full Flutter regression suite | SUCCESS: 129/129 | `flutter test`; `/tmp/hudhud-final-tests.log` |
| Firestore Rules | SUCCESS: 23/23 | Node 22 `npm run emulators:test`; `/tmp/hudhud-rules-tests.log` |
| OTP emulator suite | SUCCESS: 10/10 | Node 22 `npm run emulators:email-verification`; `/tmp/hudhud-final-email-tests.log` |
| Deletion and scheduled cleanup | SUCCESS: 3/3 | Node 22 `npm run emulators:account-deletion`; `/tmp/hudhud-deletion-scheduler-tests.log` |
| Email test runner safety | SUCCESS | Existing override refused untouched; failure exit propagated; termination forwarded; temporary synthetic override removed. No real secret read. |
| Admin checks | SUCCESS: lint, 4 tests, Official-root build | Node 22 `npm run lint`, `npm test`, `VITE_FIRESTORE_ROOT=HudHudOfficial npm run build` in `admin_web` |
| Android debug build | SUCCESS on platform integration candidate | `flutter build apk --debug`; `/tmp/hudhud-t02-build.log`. Subsequent Apple-only guard is covered by final Flutter tests. |
| iOS simulator build | SUCCESS: Runner.app built | `flutter build ios --simulator --debug`; `/tmp/hudhud-final-ios.log`; Xcode build 137.0 seconds |
| Release configuration guards | SUCCESS: expected rejection | Missing Android signing and Development root rejected; six positive/negative iOS preflight cases passed. |
| Governance and patch whitespace | SUCCESS | `./tool/verify-governance.sh`; `git diff --check` |
| Independent security candidate review | SUCCESS: corrections verified locally | Fresh read-only reviewer identified deletion resurrection and absent Apple revocation-code paths; both corrected with regression coverage. |
| Signed artifacts / live providers / physical devices / store launch | NOT RUN / BLOCKED | See T13/T14 and the [candidate handoff](release-candidate-handoff.md). |

Nonblocking observations: admin build reports a large JavaScript chunk;
`flutter_facebook_auth` currently requires CocoaPods rather than Swift Package
Manager. Neither warning establishes release-device performance or store approval.

### iOS integration follow-up

The first simulator attempt failed because the generated Swift package retained
minimum iOS 13 while installed Firebase packages require iOS 15. The project and
Podfile already specified 15; making the Runner target explicit in all three
configurations and running `flutter build ios --config-only --simulator --debug`
succeeded and regenerated the package at 15. This follows the
[Flutter minimum-deployment guidance](https://docs.flutter.dev/packages-and-plugins/swift-package-manager/for-app-developers#how-to-use-a-swift-package-manager-flutter-plugin-that-requires-a-higher-os-version).
Crashlytics uses configuration-specific input lists so Debug/Profile builds do
not require release dSYMs. The CocoaPods lock update reflects Flutter's existing
Swift Package Manager integration, leaving Facebook's fallback in CocoaPods.
Final simulator rebuild: **SUCCESS**, exit 0; `build/ios/iphonesimulator/Runner.app`. The platform agent also reviewed the target propagation and Crashlytics file lists with no further concrete issue found.

## Completion checklist

- [x] Implement local blocker fixes and reconcile release contracts.
- [x] Run bounded implementation agents and fresh independent candidate review.
- [x] Correct review findings and pass final automated regressions.
- [x] Build Android debug APK and iOS simulator app.
- [x] Record successes, evidence, owners and next actions in Markdown.
- [x] Prepare build/deployment and store handoff.
- [ ] Supply signing, actual store identifiers and approved production settings.
- [ ] Verify signed artifacts, live services, physical devices and store package.
- [ ] Submit/publish and verify rollout health.

Checked items were completed locally on 2026-09-06. Unchecked items are not
reported as successful, store-ready or live.
