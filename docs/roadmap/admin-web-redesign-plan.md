# HudHud FM admin control panel redesign plan

Date: 2026-09-07  
Status: Implementation active; local changes and checks are recorded below. No deployment performed.  
Target: `web_admin/` (called `admin_web` in the request and some existing documentation).

## 1. Outcome and approach

Current requirement-level status is tracked in
[the acceptance audit](admin-web-acceptance-audit.md). Checkpoint remaining-work
lists below are historical and are not substitutes for the complete audit.

Revise the existing admin into an Arabic-first operations panel that covers the content and operational needs of every current Flutter screen. Replace technical document editing with guided workflows, align the theme with HudHud FM, and make content visibility, relationships, and moderation decisions understandable.

Recreate the experience incrementally inside `web_admin/`. Retain React, TypeScript, Vite, Firebase, Tailwind, and the existing UI components. Do not create a parallel admin application or change the Flutter architecture. New dependencies require a concrete gap in the existing stack.

“Cover every screen” means identifying its managed content, operational controls, preview, or deliberate app-owned boundary. It does not mean exposing authentication internals or making compiled app behavior remotely editable without a supported contract.

## 2. Evidence and current gaps

This is a source-based planning review, not a browser-verified visual audit. Visual validation is a required implementation phase.

| Evidence | Current behavior | Planned response |
| --- | --- | --- |
| `web_admin/components/admin/admin-app.tsx` | Authentication, navigation, queries, tables, JSON editor, validation, and mutations share one large file | Extract small feature modules while preserving behavior |
| `ResourceEditor` | Operators edit raw JSON and document IDs | Typed forms, relationship pickers, inline validation, previews |
| `Dashboard` / `Overview` | All resources have active listeners capped at 250; metrics use those loaded records | Page-scoped queries, pagination, accurate scoped totals or explicit partial-data labels |
| `validateResource` | Parent validation uses loaded records; stream URLs require HTTPS; schedules are required | Resolve parents independently of list pages; reconcile with Flutter accepting HTTP streams and optional schedules |
| `deleteWithRelations` | Station/program dependency guards inspect loaded records | Authoritative dependency checks and concurrency protection before destructive operations |
| `web_admin/lib/admin-resources.ts` | Stations, programs, episodes, banners, users, comments, reports, favorites, subscriptions exist; locations are absent | Add location management aligned with the existing collection and Rules |
| `web_admin/app/globals.css` and `lib/core/theme/app_colors.dart` | Admin uses green/gold; app uses burgundy and warm surfaces | Shared visual identity expressed as web theme tokens |
| `web_admin/main.tsx` | Public deletion, community, privacy, and terms routes coexist with admin | Preserve those routes and deletion-session isolation |
| `lib/features/notifications/` and `functions/index.js` | App announcement opt-in exists; no announcement-sending admin workflow identified | Treat sending as a separate backend-dependent feature |

### Contract discrepancies to resolve in phase 0

- Product UX still contains “no admin panel” while later clauses and executable code define one.
- Quality/release documentation uses `admin_web`; the actual directory is `web_admin`.
- Account documentation describes automatic OAuth verification and camera/gallery profile images, while security/data contracts and release boundaries impose different requirements. Check executable authentication/profile code and tests before defining account controls.
- Station-content documentation names only the development root in its architecture sketch; current environment ownership supports both approved roots.
- Do not settle these discrepancies by changing app behavior during a visual refactor. Record the intended decision and update its owning contract with the relevant implementation slice.

## 3. Complete app coverage matrix

Legend: **Existing** = admin capability exists but needs refinement; **Gap** = new admin UI using an existing app capability; **Extension** = requires a new backend/data/app contract; **App-owned** = deliberately remains in the app or release process.

| App screen or feature | Admin destination and controls | Boundary / completion evidence |
| --- | --- | --- |
| Splash and Firebase setup gate | Operations: configuration/readiness summary | App-owned; never expose Firebase secrets or remote bootstrap overrides |
| Onboarding and replayed app tour | App experience: screen inventory and release preview | App-owned today; remote copy/artwork requires versioned config, Flutter consumer, cache/fallback, and Rules |
| Home station grid/list and search | Stations: names, frequency, descriptions, artwork, featured state, priority, activation | Existing; preview ordering and search fields; grid/list preference stays local |
| Home city filters | Locations: city codes, Arabic names, order, active state, affected stations | Gap; preserve Yemen-only discovery and active-location/station intersection |
| Home banners | Banners: image, title, priority, active flag, start/end dates, preview | Existing; do not promise click navigation while Flutter target handling is unimplemented |
| Station details: header, about, live playback | Station editor: metadata, artwork, primary/backup stream, live/verified flags | Existing; explain that `isLive` is editorial state, not measured stream availability |
| Station details: programs | Station workspace → Programs | Existing; parent-linked create/edit, visibility, ordering, and derived counts |
| Station details: weekly schedule | Schedule workspace: station/day filters and weekly agenda | Existing data, new guided UI; optional schedule, ISO weekdays, explicit UTC offset, no overnight interval |
| Program details | Program editor: localized titles, description, presenters, categories, artwork, related episodes | Existing; maintain app-supported fields and inactive filtering |
| Episode playback and details | Episode editor: program, derived station, audio, duration, dates, image, guest/presenter, publish state | Existing; valid HTTPS media and timestamp conversion; preview unpublished content clearly |
| Episode comments and UGC acceptance | Community: comment context and associated reports; policy version reference | Existing; no generic comment editing or fabricated user consent |
| Comment/user reporting and personal blocking | Moderation queue: context, reason, status, supported decision and resolution history | Existing; keep reporter identity out of normal views; personal blocking remains user-controlled |
| Favorites | Audience: authorized review, target resolution, explicit removal | Existing admin records; station favorite controls are confirmed in Home/details; do not imply standalone screens or all target UIs exist |
| Station/program subscriptions | Audience: review active state and notification preference, explicit removal | Existing admin/schema support; not paid subscriptions; verify listener UI before promising more |
| Settings/account hub | App experience: map share, rating, about, tour, community links to release-owned sources | App-owned behavior; no arbitrary “screen enabled” switches |
| Sign-in, registration, verification, password reset, provider flows | Operations guidance and safe account support | User projections remain read-only; no password/OTP view, manual verification toggle, or browser role assignment |
| Manage account and profile editing | Audience: minimum authorized profile projection and moderation state | Existing read-only boundary; Auth remains identity authority; resolve profile contract discrepancy first |
| Account deletion and public deletion page | Operations: existing public route and documented support path | Preserve user reauthentication and cross-root deletion; no generic admin delete-user action |
| Notifications | Announcements: compose and preview textual announcements | Extension for sending; keep opt-in topic behavior, no arbitrary payload navigation or claimed persistent app inbox |
| Shared mini-player and background media controls | Content preview: manual audio test with clear stop state | App-owned player behavior; admin does not control a listener’s playback or device volume |
| About, privacy, terms, community guidelines | App experience: public-page preview, links, release checklist | Existing static pages; CMS publishing requires versioning and coordinated app/UGC policy handling |
| Offline, loading, empty, error and accessibility states | Preview/QA scenarios for each affected screen | App-owned runtime states; test fixtures, not remotely editable user errors |

## 4. Information architecture

Use a right-side desktop sidebar with clear groups, a compact mobile drawer, breadcrumbs, and a persistent environment label. Proposed destinations are UI organization, not new Firestore collections.

| Group | Destinations | Primary task |
| --- | --- | --- |
| Overview / نظرة عامة | Actionable dashboard | Review open reports, content readiness, upcoming schedules, expiring banners |
| Content / المحتوى | Stations, Programs, Episodes, Weekly schedule, Banners, Locations | Create and maintain listener-visible content |
| Community / المجتمع | Moderation queue, Comments | Make traceable moderation decisions |
| Audience / الجمهور | Users, Favorites, Subscriptions | Limited support and authorized review |
| App experience / تجربة التطبيق | Screen coverage, app previews, public pages | Understand which changes affect which screens |
| Operations / التشغيل | Environment/readiness, announcement capability when available | Diagnose safely and perform supported operational tasks |

Persist list filters and navigation in a minimal URL state scheme so refresh, browser back, and shared admin links work. Select the route approach during phase 1; preserve public pathname handling and avoid adding a router solely for appearance.

## 5. Core operator workflows

### Content list → edit → preview → save

1. Search and filter by meaningful names, parent, visibility, city, or publication state. Make search scope explicit; searching a loaded page is not global search.
2. Open a detail page with a clear title, status, parent breadcrumb, and a single primary action.
3. Group fields into Basics, Media, Relationships, Visibility, and Schedule where relevant. Use searchable parent selectors backed by independent queries, not the first 250 records.
4. Show field errors beside inputs and a focusable summary. Keep unsaved input after failures; warn before discarding it.
5. Show an app-like preview with the same visibility and ordering rules. State which aspects are approximations; validate against Flutter screenshots before calling it faithful.
6. Save only supported editable fields. Preserve unknown stored fields, lock derived counters, prevent duplicate submission, and show confirmed server success.
7. Detect stale edits before overwriting another operator’s changes. Choose a compatible transaction/version approach during data design; version fields require a schema decision.

JSON editing is removed from routine operator flows after typed-form parity is proven. A diagnostic JSON view, if useful, is read-only and excludes sensitive fields.

### Entity-specific requirements

- **Stations:** choose a canonical location; distinguish active, featured, verified, and live. Preserve supported HTTP/HTTPS stream behavior after contract reconciliation. Manual stream preview must stop on navigation and explain browser mixed-content/CORS limitations without claiming mobile playback failure.
- **Programs:** choose a station, manage presenter/category lists, allow no schedule. Prevent reparenting from orphaning existing episode station references; block the action until an atomic, bounded migration path exists.
- **Schedule:** day chips, time inputs, explicit timezone, list alternative to calendar. Warn about overlaps as an editorial check; do not invent an exclusivity rule. Keep overnight intervals unsupported until the app contract changes.
- **Episodes:** derive station from program, display local broadcast time and UTC offset, validate media and duration, distinguish unpublished/published state. Scheduled publishing is an extension, not a consequence of setting a date.
- **Banners:** image preview, priority, validity window, effective active/expired state. Target controls explain current app limitations.
- **Locations:** show linked stations before deactivation/deletion; prefer deactivation when references exist. Never leave city filters silently disconnected.
- **Media:** begin with validated URLs and image fallbacks. Uploads/media library require a separate Storage path, Rules, file limits, ownership, and cleanup design; no new upload dependency in the initial slice.

### Moderation

Use a queue/detail layout with filters for status and report type. Detail includes the reported comment, episode/program context, reason, limited details, and prior decision where available. Preserve the existing supported dismiss/hide/remove/disable-account actions, required decision record, server timestamp, and atomic resolution.

Explain impact before applying a decision. Handle already-resolved reports, removed content, revoked permissions, and simultaneous moderators explicitly. Disabling the app profile must not be described as disabling Firebase Auth unless the backend actually performs that action. General account deletion remains separate.

### Dashboard

Prioritize work requiring action over decorative metrics. Every metric identifies its scope and freshness; an unavailable metric is not zero. Use authoritative counts or clearly labeled partial counts. Do not label stored play counters as live listeners, or URL-format validation as stream health. Historical charts require real event/aggregate sources and a privacy/retention decision.

## 6. Theme and UI specification

Direction: a calm burgundy operations interface that belongs to the existing mobile brand. Prefer neutral work surfaces, compact hierarchy, and restrained branding over large promotional cards.

| Token / rule | Proposed baseline |
| --- | --- |
| Brand primary | `#8E3E63`, matching Flutter `AppColors.primary` |
| Light canvas | `#FCF8F8`; white cards; dark warm text |
| Soft selection surface | `#FFD8E4` with `#3B0021` text |
| Border | `#D5C2C6`, adjusted where stronger control contrast is needed |
| Brand gradient | `#8B2648` → `#451222`, restricted to small identity areas |
| Status | Separate success, warning, danger, and information tokens; always pair with text/icon |
| Dark theme | Warm charcoal/plum surfaces with lighter burgundy accents; independently verify each foreground/background pair |
| Typography | Arabic-first readable font stack; reuse available licensed assets or system fonts; 14–16px body baseline and clear heading levels |
| Spacing | 4px scale; 16–24px panel spacing; consistent 8–12px corner radii |
| Tables | Clear headers, readable Arabic names, status chips, predictable row actions, visible pagination |
| Theme control | Light / dark / system, stored locally; avoid initial theme flash |

Arabic is default; use logical CSS spacing/alignment, localized labels and validation, and LTR isolation for IDs/URLs. Keep English messages synchronized through a web localization structure chosen in phase 1; Flutter ARB remains the Flutter source, not a new web runtime dependency.

Design acceptance targets: keyboard-complete journeys, visible focus, labeled controls, correct dialog focus restoration, 200% zoom, 48px primary touch targets, and readable layouts at 360, 768, 1280, and 1440px. Validate contrast, including muted text and dark mode, rather than assuming brand colors pass in every pairing. Respect reduced motion. Keep mascot usage within approved brand contexts and out of dense data tables.

## 7. Architecture, data, and permission boundaries

- Retain `web_admin/main.tsx` as the entry point and public-route owner.
- Gradually reduce `components/admin/admin-app.tsx` to session/shell composition. Add focused components under the existing `components/admin/` convention as slices need them.
- Keep resource definitions in `lib/admin-resources.ts`; move serializers, validators, queries, and mutation logic into focused `lib/` modules. Proposed modules are future work, not existing APIs.
- Reuse `components/ui/` primitives and current React state/hooks. Do not import Riverpod concepts into the web app or add another state library without need.
- Load the active resource page only. Define cursor ordering and tie-breakers; keep targeted listeners only where freshness is necessary and unsubscribe on exit.
- Determine required indexes from actual query shapes and emulator evidence. Preserve root bounds before collection-group limits and deny cross-root writes.
- Keep `admin=true` as the existing permission boundary. Editor/moderator/admin role splitting is an extension requiring backend claims, Rules, and allow/deny tests before UI availability.
- Preserve atomic counter updates; replace page-limited dependency assumptions with authoritative, concurrency-safe operations. A client preflight alone is insufficient to prevent a concurrent child creation. Select and test a server/rules-enforced invariant before enabling affected deletes or moves.
- Keep `HudHudDev` / `HudHudOfficial` build selection explicit. Show the selected environment persistently; do not add an unguarded runtime environment switch. Auth is shared across roots, so development content isolation does not imply isolated identities.
- Do not expose credentials, verification challenges, tokens, reporter identity, or raw errors. Limit profile access to an operational need. Use synthetic data in screenshots and fixtures.
- General content audit/version history is new scope: define event fields, permitted readers/writers, retention, and sensitive-field redaction first. Existing moderation decisions remain traceable during refactoring.

## 8. Backend-dependent extensions

These capabilities complete broader control-panel coverage but must remain labeled as planned until end-to-end support exists.

| Extension | Prerequisites | Acceptance gate |
| --- | --- | --- |
| Announcement publishing | Authorized server sender, supported topic, environment/audience policy, rate limits, idempotency, minimal send history | Explicit final recipient/content review, duplicate-send protection, device delivery testing; no sends during UI development |
| Remote onboarding/about copy | Versioned content schema, localization, Flutter reader, offline defaults, Rules | Old app versions remain usable; invalid config cannot block startup |
| Media uploads | Storage contract, allowlisted types/sizes, access controls, lifecycle cleanup | Unauthorized uploads denied; failed edits do not leave unbounded orphan files |
| Content revisions / scheduled publishing | Server mutation/version model and retry-safe scheduler where needed | Restore/publish preserves relationships, visibility, and counters |
| Permission roles | Claims provisioning policy and granular server enforcement | Each role passes explicit allow/deny cases; hidden buttons alone do not count |
| Analytics / stream monitoring | Defined data sources, cost budget, privacy retention, safe network checks | Clearly dated observed metrics; no invented history or client-controlled telemetry totals |

## 9. Implementation sequence and acceptance

Work in vertical slices. Estimates should follow phase 0 and a representative station editor; backend extensions are sized separately.

| Phase | Deliverables / affected areas | Depends on | Exit criteria |
| --- | --- | --- | --- |
| 0 — Baseline and decisions | Screen inventory, dev screenshots, contract discrepancy decisions, current test baseline | None | Matrix verified against app flows; blockers assigned; synthetic fixtures prepared |
| 1 — Shell and design system | Theme tokens in `app/globals.css`, responsive shell, URL navigation, localized primitives | 0 | Light/dark RTL shell works; public routes/auth isolation preserved; keyboard/mobile screenshots reviewed |
| 2 — Data foundation and station slice | Query/mutation boundaries, pagination, independent relation lookup, station form, preview, location controls | 1 | Record beyond position 250 is reachable; full station workflow works; location impact is visible; no counter editing |
| 3 — Programs, schedules, episodes | Typed editors, parent-derived fields, schedule agenda, publish visibility, relation safeguards | 2 | Optional schedule and time boundaries match Flutter; invalid relations rejected; concurrent edits/deletes tested |
| 4 — Banners and app coverage | Banner timing/preview, screen coverage registry, release-owned page previews | 3 | Operator can map each edit to an app screen; inactive/expired content matches Flutter behavior |
| 5 — Community and audience | Moderation queue/detail refinement, read-only profiles, favorites/subscription review | 2 | Existing atomic moderation and privacy protections pass regression tests; no generic user deletion |
| 6 — Operational overview | Honest scoped counts, freshness/error states, actionable links | 3–5 | No capped-list totals presented as global totals; no unsupported analytics |
| 7 — Integrated QA and rollout preparation | End-to-end dev evidence, accessibility checks, operator walkthrough, rollback artifact | 1–6 | All core acceptance criteria pass; release checklist records limitations and deployment authorization |
| 8 — Optional extensions | Separately prioritized backend-dependent capabilities | 7 + individual contracts | Each extension passes its own server, app, privacy, and operational gates |

Recommended first implementation slice: shell/theme plus the complete station list → edit → preview → save journey. This establishes reusable patterns before converting the remaining resources.

## 10. Verification plan

For this Markdown-only task: run governance verification, check relative links, and review the diff. App test/build commands below are implementation gates, not claims of execution in this planning task.

For web changes, from `web_admin/`:

```sh
npm run test
npm run lint
VITE_FIRESTORE_ROOT=HudHudDev npm run build
```

Also verify missing/invalid roots fail as expected and the explicit production-root build succeeds locally before release packaging; building is not deployment. Use the Node version required by `web_admin/package.json`.

For changed Rules/writes, from the project root:

```sh
npm run emulators:test
```

For affected backend/account-deletion behavior, run the applicable existing Functions tests and `npm run emulators:account-deletion`. For any Flutter change, run the governance/format/analyze/test/Android build gates in the quality contract, plus iOS checks when the change has platform impact.

Required behavior cases:

- Guest/non-admin denied; expired/revoked admin permissions cannot retain write access.
- Each root remains isolated in pagination, lookup, counts, and mutation paths.
- More than 250 records; parent outside the current page; deleted parent; stale edit; concurrent delete/create; retry after partial failure.
- Required/optional fields, URL schemes, timestamps, schedule boundaries, visibility rules, and relationship counters agree with Flutter mappers and Rules.
- Moderation decisions retain atomic resolution; hidden/removed comments remain unavailable publicly.
- Loading, genuine empty, filtered-empty, failure, disconnected/stale data, permission denial, and unsaved-change states are distinct. Administrative writes never claim success while only locally queued.
- Arabic/English, RTL/LTR mixed fields, keyboard, screen reader, 200% zoom, narrow viewports, and both themes.
- `/account-deletion`, `/community-guidelines`, `/privacy`, and `/terms` remain reachable without admin login; deletion identity stays isolated.
- Validate matching app screens with development fixtures after saving content; web previews alone do not prove Flutter compatibility.

## 11. Rollout and definition of done

Keep each slice compatible with current documents and supported app versions. Remove its superseded editor only after parity passes; avoid a permanent second admin. Prepare the previous hosted artifact for UI rollback. Any schema migration needs a dry-run, scoped apply, compatibility plan, and separate data rollback; restoring a web build does not undo writes.

The core redesign is done when every coverage-matrix row has a working control or an explicit app-owned/extension boundary; routine content work needs no JSON; all existing moderation/public routes remain functional; data scope and status are truthful; and operators can complete the principal workflows in a reviewed RTL interface. Deployments and real notification sends remain concrete operational actions under the applicable authorization.

## 12. Local references

- [Admin setup and current capabilities](../../web_admin/README.md)
- [Product UX contract](../contracts/product-ux-contract.md)
- [Firebase data contract](../contracts/firebase-data-contract.md)
- [Security and privacy contract](../contracts/security-privacy-contract.md)
- [Station content contract](../contracts/station-content-contract.md)
- [Account, comments, notifications contract](../contracts/account-comments-notifications-contract.md)
- [Brand identity contract](../contracts/mascot-brand-identity-contract.md)
- [Architecture contract](../contracts/architecture-contract.md)
- [Quality and release contract](../contracts/quality-release-contract.md)
- [Release boundary decision](../decisions/0002-store-release-boundaries.md)


## 13. Development checkpoint — 2026-09-07

Implementation is active in Default/Code mode; the goal remains incomplete.

Implemented locally: Arabic RTL burgundy light/dark/system shell, explicit environment label, navigation and screen-coverage map; guided editors for stations/programs/episodes/banners/locations with relation lookup, preview, validation and dirty-form warnings; optional schedules and agreed URL schemes; 50-record pagination and server aggregate counts. Saves use transactions, stable creation IDs, stale-edit checks and preserved counters. Deletion checks dependent records on the server and uses transactions. Moderation queries matching reports beyond the current page and checks current comment status before decrementing counters. A required moderation author/root index is added locally. The lockfile now includes the missing existing Recharts peer dependency.

Verification: Node 22.23.2; admin lint/TypeScript pass, eight admin tests pass, 23 existing Rules emulator tests pass, governance and whitespace checks pass. Vite builds with synthetic demo Firebase values because local Firebase configuration is absent; it warns about a large JavaScript chunk. These checks do not establish authenticated UI quality or new mutation concurrency correctness.

Remaining before acceptance:
- Authenticated emulator fixtures and visual/keyboard/mobile/zoom review; complete loading/stale transitions.
- Dedicated mutation tests for concurrent deletion/comment creation, retries, missing parents, off-page dependencies and moderation contention. Episode deletion now uses a Rules-enforced temporary marker; dedicated emulator checks cover concurrent comments, retries, interrupted markers, missing parents and both roots. Matching Rules must precede the UI release.
- Review city reference edits, banner targets, creation timestamps and Flutter mapper parity. Existing program reparenting currently rejects changes to avoid stale episode station references.
- Camera/gallery uploads, server validation, durable storage access, replacement/orphan cleanup and account deletion across both roots.
- Reconcile confirmed decisions in normative contracts; verify Flutter/backend changes.

No production data writes or deployment were performed. The new index is not deployed.


Checkpoint update: the episode-deletion guard is implemented and verified. All 24
Rules tests pass, as does the dedicated admin deletion emulator suite. Remaining
mutation tests include other resource relationships and moderation contention.
Profile uploads and authenticated visual review remain unimplemented/unverified.


## 14. Profile upload and contract checkpoint — 2026-09-07

Camera/gallery selection is implemented through an injected Dart picker service,
repository and existing profile callable. Flutter previews the selected image,
preserves it on picker cancellation, validates the byte limit and handles save
failures. The server verifies Auth/profile/deletion barriers, re-encodes JPEG/PNG
without metadata, rate-limits uploads and stores owner/root-scoped objects.
Replacement cleanup, private durable cleanup jobs, an hourly collector and
both-root account deletion are wired in. Storage Rules deny direct SDK access;
HTTPS bearer URLs provide image display. Matching Storage/Functions configuration
must be deployed together only after the normal release review; no deployment
has occurred. Existing deployed bucket/Rules configuration must be checked before
applying the new Storage rules to a shared project.

Verified: nine Functions unit tests; two profile-image emulator scenarios covering
verification, access denial, replacement, name-only edits, rate limiting,
both-root deletion, orphan cleanup and inactive-profile retention; all 131 Flutter
tests (including 57 account tests); Flutter analysis; existing account-deletion
emulator suite. Confirmed contract discrepancies about OAuth verification,
`web_admin`, both content roots and upload scope are reconciled.

Still required: authenticated admin visual/keyboard/mobile/zoom review, remaining
admin workflow/concurrency tests and mapper parity review, Android/iOS builds and
device-level camera/gallery checks. Upload/deletion overlap tests should also
exercise forced interrupted saves beyond the normal lifecycle scenario.


## 15. Authenticated admin review — 2026-09-07

Added a guarded demo-only Auth/Firestore preview seeded by
`tool/seed-admin-preview.mjs`. Emulator mode is opt-in and restricted to Vite
serving in development, `demo-*` projects and HudHudDev; builds reject it. Admin
claims remain required and public deletion keeps its isolated auth session.

Observed in Chrome: totals show 55 stations; paging shows 50 then five with next
disabled; relation pickers load cities beyond 50; saving an HTTP station stream
and creating a program without a schedule succeed. Inspected light/dark desktop
and 390×844 states. Fixed the undefined font variable causing a Times fallback,
mobile actions pushed off-screen (now cards), English close label, login jargon,
paging loading state and creation-time dates. Schedules start disabled. Browser
Back prompts for dirty content; cancellation retained the edited form. Inputs are
disabled while saving.

Nine ordinary admin tests, TypeScript, lint and synthetic build pass; the build
retains its large-chunk warning. Browser control then stalled on the draft-discard
confirmation; viewport reset could not be confirmed. Remaining keyboard/200%-zoom
and editor-state checks are unverified. Recover the preview before continuing.
Remaining workflow review: location-reference edits, reparenting, readable
relationship names, schedule clock inputs, and moderation concurrency.

## 16. Relationship and native build checkpoint — 2026-09-07

Current status supersedes the remaining-work statements in earlier checkpoints.
Schedule editors now use clock inputs with explicit midnight handling and safe
malformed-data display. Resource pages resolve readable relation names in bounded
batches and display comment publication status correctly.

Program transfers now update all episode station references and both station
counters atomically. The transaction reads the program before querying children;
concurrent episode creation changes its counter and retries the child query.
Transfers above 450 episodes fail before writing and explain how to reduce the
transfer size. This relies on writers preserving the existing atomic counter
contract; arbitrary administrative SDK writes remain outside that guarantee.

Verified: 11 ordinary admin tests, lint, TypeScript and synthetic Vite build;
both dedicated admin emulator scenarios (deletion and transfer), including
off-page children, forced concurrent creation, both roots and transfer limits.
All three profile-image emulator scenarios pass, including deletion during a
paused upload. Android debug and iOS simulator builds pass. Build-generated iOS
dependency/configuration changes were removed; no platform migration is included.
The Vite bundle remains approximately 950 kB before gzip and emits a size warning.

Remaining: location reference consistency, moderation contention, completion of
keyboard/zoom/editor-state visual review, and physical camera/gallery checks.
No production data writes or deployment occurred. The development goal is active.

## 17. Location projection checkpoint — 2026-09-07

City/country edits now atomically update copied location fields on associated
stations, with a 450-station bound. Station saves transactionally revalidate the
selected reference and increment its internal `adminRelationRevision`; this
forces a concurrent location edit to repeat its station query. A no-op write was
tested and proved insufficient, then replaced with the revision increment.
Station selection rejects ambiguous duplicate country/city codes rather than
choosing an arbitrary match. Location activation-only changes do not alter stations.

Verified: all three dedicated admin emulator scenarios pass, including 56 stations,
forced concurrent station creation, stale location rejection, retained station
counters and both roots. Ordinary admin tests, lint, TypeScript, synthetic build,
governance and whitespace checks pass. The existing bundle-size warning remains.

Remaining: prevent duplicate location codes during creation/rename, moderation
contention tests, completion of keyboard/zoom/editor-state visual review, and
physical camera/gallery checks. No deployment or production mutation occurred.

## 18. Unique location identity checkpoint — 2026-09-07

Location saves now prevent duplicate country/city code pairs, including concurrent
creates and conflicting renames. A private revision on `{root}/locations`
serializes the uniqueness query without changing existing location IDs. Matching
Rules allow only admin get/create/update on that parent document. They must be
released before the new admin workflow; no Rules were deployed locally.

Verified: the location emulator scenario forces both creates past their initial
uniqueness queries before commit and proves exactly one succeeds, in both roots.
It also verifies a rejected rename retains the original code. All three admin
emulator scenarios, all 25 Rules tests, 11 ordinary admin tests, lint, TypeScript,
synthetic build, governance and whitespace checks pass. The bundle warning remains.

Remaining: moderation contention tests and any resulting fixes, completion of
keyboard/zoom/editor-state visual review, and physical camera/gallery checks.
The overall goal remains active; nothing was deployed or written to production.

## 19. Moderation concurrency checkpoint — 2026-09-07

Moderation writes now use the independently tested `reviewReport` helper. It
reads current report/comment/account state directly in its transaction, validates
the comment author and selected root, and applies report resolution, visibility,
counter and account changes atomically. It queries only open reports, so closed
history does not consume the 450-report bound. Safe actionable errors reach the
UI. The matching author/status/document-name index is added but not deployed.

Verified: all four admin emulator scenarios pass. Moderation coverage includes
simultaneous hide/remove decisions, 55 matching open reports beyond a page,
400 closed reports preserved, exactly one counter decrement, replay rejection,
account disabling after comment moderation, and both roots. Ordinary admin tests,
lint, TypeScript, synthetic build, governance and whitespace checks pass.

Remaining: complete keyboard/zoom/editor-state visual review, physical
camera/gallery checks, and the final requirement-by-requirement acceptance audit.
Browser inventory is responding again and the prior preview tab still exists;
its pending dialog and actual interaction have not yet been recovered.

## 20. Keyboard and mobile editor checkpoint — 2026-09-07

The old preview tab was no longer available; a fresh guarded demo preview is
working. Verified keyboard skip-link focus to workspace content, Enter opening
the program editor, Tab/Shift+Tab wrapping inside the modal, and Escape restoring
focus to its trigger. Screenshots and DOM geometry show no page overflow at
390×844 and 896×431. Browser dimensions were restored after these checks.

Fixed native English validation bubbles by routing submit through existing Arabic
validation; the error summary receives focus and derived errors clear as values
are corrected. Program previews now show weekdays, clock times and UTC offset.
Verified the mobile preview and successful save of a synthetic Monday 23:00–00:00
program, plus a corrected-validation save. Native keyboard time edits reached
React state; automation fill alone did not, so it was not used as proof of saving
the requested times. Loading/saving controls were observed disabled.

Ordinary tests, lint, TypeScript and synthetic build pass. Actual browser 200%
zoom remains unverified: supported shortcut dispatch did not change browser zoom;
896×431 proves equivalent layout reflow only. Remaining work is the final full
acceptance audit, any missing editor/state coverage it identifies, actual zoom
and physical camera/gallery checks. No production activity occurred.

## 21. Full-scope audit and audio preview — 2026-09-07

The requirement-level audit identified planned capabilities absent from earlier
checkpoint lists: weekly agenda/overlap checks, effective banner timing, location
impact, filter persistence, broader fixture coverage, language support, and
rollout evidence. These remain tracked in `admin-web-acceptance-audit.md`; the
goal cannot be completed merely by closing the most recent checkpoint items.

Manual station/episode audio preview is now implemented with native controls,
no autoplay, no preload, Arabic error feedback and pause/unload cleanup. Rendered
controls, unavailable-fixture feedback and removal on leaving preview were
observed in Chrome. Valid playback/stop verification still needs a local fixture.
Caption lint is narrowly exempted for this diagnostic player because the existing
content schema provides no caption track; no empty/fabricated captions are added.
Lint, TypeScript, synthetic build, governance and whitespace checks pass; the
existing bundle-size warning remains. No deployment occurred.

## 22. Banner effective visibility — 2026-09-07

Banner lists and previews now distinguish inactive, upcoming, visible and expired
states; malformed timing is identified explicitly. Start is inclusive and expiry
exclusive, matching Flutter `BannerItem.isVisibleAt`. A boundary timer refreshes
the badge without a permanent polling loop. Four guarded demo fixtures were
added and observed on desktop and 360px mobile cards; viewport restored afterward.
The timer transition itself still needs browser observation. Twelve ordinary
tests pass, with dedicated emulator tests intentionally skipped outside their
emulator command. Lint, TypeScript and synthetic build pass; bundle warning remains.
No production write or deployment occurred.

## 23. Weekly agenda — 2026-09-07

Added a dedicated weekly agenda with independent station lookup, day/all-week
selection, optional inactive programs, 100-record program paging and explicit
partial-result labels. It renders local schedule times and each UTC offset,
identifies malformed schedules and warns about active-program overlaps across
the week, including offset-induced Sunday/Monday boundaries. Warnings are
advisory. Loading/failure does not masquerade as an empty initial schedule.

Thirteen ordinary tests pass, including adjacency/non-overlap, duplicate weekdays,
malformed schedules and cross-week UTC overlap. The saved Monday 23:00–00:00
fixture appears in the browser agenda. Lint, TypeScript and synthetic build pass.
Remaining agenda verification: rendered overlap warnings, large-page/retry cases,
responsive review and URL-persisted filters. The full audit remains authoritative.

## 24. Location impact preview — 2026-09-07

Existing-city editors now show an authoritative linked-station count and paged
station names/status before the activation control. The explanation matches
Flutter discovery: deactivation removes the city filter but does not deactivate
stations; location field edits update copied station fields. Queries use the
original saved identity so editing the code does not hide the affected records.
Loading/error/empty states and refresh/load-more controls are explicit.

Observed the one-station fixture and readable 360px dialog; viewport restored and
clean editor closed. Lint, TypeScript and synthetic build pass. Multi-page/failure
impact scenarios remain in the full audit; no production data was changed.

## 25. More-than-250-record verification — 2026-09-07

The guarded `--large-only` seeder adds station/city fixtures 56–305 in bounded
batches without overwriting earlier review edits. In Chrome, pages six and seven
show records 251–300 and 301–305 respectively, final Next is disabled, and the
dashboard reports 305 stations. Record 305 saved successfully. The current
relationship label now resolves independently of the first picker page; its city
name was observed while only the first 50 options were loaded.

Lint, TypeScript and ordinary tests pass. An explicit HudHudOfficial build with
synthetic Firebase settings succeeds locally; no production service connection,
write or deployment was involved. Remaining list work is tracked in the audit.

## 26. Agenda filter links — 2026-09-07

Agenda station/day/inactive filters now live in the section hash query. Invalid
IDs/day values are rejected by the parser. Reload and Back/Forward restore the
filters; changing station remounts its query state so cursors/records cannot be
reused across stations. Section parsing preserves the existing public path owner.

Observed a complete filtered-link reload, Back restoring the inactive setting,
and station switching/Back restoring the original four-program dataset. Fourteen
ordinary tests, lint, TypeScript and synthetic build pass. Generic resource-list
filters/persistence are still separate audit items. No deployment occurred.

## 27. Episode local broadcast display — 2026-09-07

Episode editors/previews now display the stored UTC instant alongside the
episode's fixed-offset local date/time, independent of the operator's device
timezone. Drafts explicitly state they are not listener-visible, and future
dates are not described as scheduled publication. Unit cases cover year/day
rollover, fractional-hour offsets and invalid/ambiguous timestamps. The agenda's
negative-offset lower bound was corrected to Flutter's -720 minutes.

Observed the draft fixture in edit and preview with 17:40 UTC / 20:40 UTC+03:00.
Fifteen ordinary tests, lint, TypeScript and synthetic build pass. Full mapper
parity remains a separate audit item. No production changes or deployment.

## 28. Overview freshness and open reports — 2026-09-07

Overview counts now include per-metric check timestamps. Refresh clears previous
values while requests run, and the text states that counts are snapshots rather
than live monitoring. The moderation card counts only open reports. Its scoped
status/document-name index is added locally and must be included in release
preparation; the emulator does not establish deployed-index readiness.

The guarded `--overview-only` fixture adds one open and two closed reports.
Chrome displays one open report and 305 total stations with check times. Lint,
TypeScript and synthetic build pass. Other overview/audit gaps remain tracked;
no production data writes or deployment occurred.

## 29. Public route smoke review — 2026-09-07

Verified `/account-deletion`, `/privacy`, `/terms`, and `/community-guidelines`
render through the public route owner. Public pages now have their own browser
titles rather than the admin title; deletion has a semantic h1 in normal and
success views. The deletion page asks for its own sign-in while the existing
admin tab remains authenticated. No provider sign-in, account deletion, policy
acceptance or production operation was performed.

Browser route/heading checks, ordinary tests, lint, TypeScript and synthetic build
pass. Real OAuth provider integration is still an external release check, not
established by a local page smoke review.

## 30. Primary touch targets — 2026-09-07

Default/large buttons now have a 48px minimum height; normal icon buttons and
dialog close controls are 48×48px. Dialog headings reserve space for the larger
close control, and the optional footer-close label is Arabic. Explicit compact
desktop variants remain compact and require separate target review.

Measured save height 48px and close 48×48px in the rendered 360px episode editor;
screenshot shows accessible footer actions and scrollable fields. The episode
list has no page overflow at 768/1280/1440. Viewport restored. Lint, TypeScript and
synthetic build pass. This does not replace full contrast, zoom or screen-reader
verification. No production changes or deployment.

## 31. Persistent server status filters — 2026-09-07

Supported resources now filter activation/publication/moderation status in
Firestore before the 50-record limit. Filter values are allowlisted and encoded
in section URLs; query pagination resets when status changes. Moderation no
longer applies a second conflicting client status toggle. New comment/subscription
collection-group indexes are local release prerequisites, not deployed artifacts.

The full-hash navigation guard runs before filter subscribers, preserving dirty
editors when Back changes only a filter. Verified draft-only results after reload,
two closed-report fixtures, and cancelled Back preserving draft text plus URL.
The temporary edited title was restored. Sixteen ordinary tests, lint, TypeScript
and synthetic build pass. Parent/city/search filters remain in the audit.
