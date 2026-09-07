# Admin redesign acceptance audit

Date: 2026-09-07. Status: incomplete; development remains active.

This audit compares the objective and sections 3–11 of the redesign plan with
the current implementation. Passing a helper test does not prove an entire
operator workflow. Earlier checkpoint lists were progress notes, not exhaustive
acceptance inventories.

| Requirement | Current evidence | Remaining proof or implementation |
| --- | --- | --- |
| Existing stack and one admin | React/Vite implementation remains in `web_admin`; public route owner preserved | Final diff review |
| Root isolation/shared Auth | Explicit roots, scoped queries, 25 Rules tests, four mutation emulator scenarios and explicit Official synthetic build | Review all mutation entry points |
| Trusted verification/profile images | Functions, Flutter picker/repository, Rules and upload/deletion emulator tests; native builds | Physical camera/gallery and final lifecycle review |
| Guided content forms | Five editors, supported payload whitelist, independent relation pickers, validation and stale checks | Shared mapper fixture and direct stale-save emulator coverage added; final editor/field review remains |
| Station playback preview | Manual audio controls render; unavailable fixture produces Arabic error; leaving preview removes player; cleanup pauses/unloads it | Local decoded playback and reset verified; device stream availability remains outside web preview |
| Weekly schedule | Dedicated station/day agenda, inactive control, paging, UTC/week-boundary overlap tests; URL filters restore after reload/Back and station changes reset dataset | Browser overlap/large-page/error checks |
| Episode dates/publication | UTC and episode-local time displayed in editor/preview; explicit draft state and no automatic future publishing; boundary/offset tests and draft fixture observed | Final full mapper/field audit |
| Banner timing | Effective status in list/preview, boundary tests match Flutter inclusive start/exclusive expiry; four states observed on desktop and 360px cards | Visible-to-expired transition observed without reload; final preview review remains |
| Location relationships | Atomic projection/uniqueness tests; editor shows server count, paged linked station names and deactivation impact; one-station fixture verified at 360px | Multi-page impact and fetch-failure review |
| Lists/navigation | 305-record paging/edit proof; server status filters with URL restore; dirty Back cancellation preserves filter and draft | City/station/program filters and page-search URL persistence implemented and browser checked; broader navigation/error coverage remains |
| Moderation | Transaction helper, 55 open/400 closed fixture, concurrent decisions/counts | Remaining moderation presentation/error audit |
| Audience boundaries | Read-only users; favorites/subscription review/removal | Rendered representative fixtures and private-data projection review |
| Overview | Server counts, unavailable/loading states, per-metric check time; open-report count excludes closed fixtures | Editorial summaries and emulator expiry boundaries verified; browser failure/retry review remains |
| App-owned and extension boundaries | Coverage registry and documented extensions | Coverage registry expanded against Flutter screens; public links retained; release-owned visual previews remain |
| Accessibility/theme | RTL/themes, keyboard focus checks; primary controls now 48px, save/close measured in 360px editor; episode-list overflow checks at 768/1280/1440 | Full contrast/remaining target review, broader screen layouts, actual 200% zoom and screen-reader evidence |
| Web language | Arabic forms and validation | Planned synchronized English/localization structure remains unimplemented |
| Runtime states | Some loading/save/validation/dirty-flow evidence | Permission revocation, network failure/stale, empty/filtered-empty, all editor error states |
| Public routes/deletion isolation | Four routes rendered with correct titles; public deletion asks for sign-in while admin remains signed in; route dispatch bypasses AdminApp; isolated Auth tests | Real provider integration remains a release-environment check; no deletion performed in this smoke review |
| Flutter/admin parity | Agreed URL/schedule contracts and unit tests | Matching Flutter fixture screens after admin saves |
| Rollout preparation | No deployment, schema/index/Rules prerequisites documented | Concrete operator walkthrough, rollback artifact/runbook and final evidence manifest |
| Codex/Gemini setup preserved | Existing setup files retained | Local final hook/governance/config parsing passed; live provider session checks remain environment-owned |

Optional backend extensions (announcement sending, remote onboarding CMS,
analytics, role splitting, scheduled publishing) remain explicitly outside the
core redesign until separately authorized and specified. This boundary does not
exclude planned UI work using existing content, such as the weekly agenda.

Actual browser zoom and physical device input are currently unverified, not
declared impossible. Equivalent viewport reflow and injected picker tests are
useful but do not replace those checks. The whole goal is not blocked while
the implementation gaps above remain actionable.

### Relationship filter checkpoint

Content lists now apply canonical Yemen city, station, or program constraints before
pagination, combine them with status, and store the selected parent in the hash.
Changing or clearing a relationship resets page cursors. Existing independent
relationship pickers support records beyond the current content page.

Verified locally: program + draft filters return the expected episode and an empty
result for a different program. Admin tests: 17 passed, 4 dedicated-emulator tests
skipped in the ordinary command. TypeScript, lint, and synthetic HudHudDev build
passed. Build retains its large JavaScript chunk warning. New collection indexes
are documented in firestore.indexes.json; production deployment was not performed.
City/station filter browser checks and reload/back combinations remain pending.

### Search persistence and relationship verification

Page search now restores from the resource-scoped `q` parameter (maximum 200
characters), preserving the other filters. Typing replaces the current history
entry instead of creating one Back step per character. Search-only changes do not
restart the Firestore listener: its status dependencies are primitive values.

Browser evidence: Arabic episode search, draft status, and program selection
survived reload together. Selecting city 2 after navigating to the next station
page reset pagination to page 1 and returned only station 2 with active status.
Station 2 produced an empty program list; station 1 returned all four fixture
programs. Checks: 18 ordinary tests passed, 4 dedicated emulator tests skipped;
lint, TypeScript, synthetic development-root build passed. Large bundle warning
persists. These checks used only the local synthetic emulator project.

### Moderation context and recorded decisions

Reports now resolve episode labels through the existing bounded batch relationship
loader. Closed reports display the stored resolution, reviewedAt and reviewedBy;
legacy records explicitly show unavailable metadata. This is the existing latest
decision record, not an invented event history. No review write behavior changed.

Browser checked one synthetic noAction decision with review time/admin ID beside
one legacy report without metadata, plus unavailable episode/comment fallbacks.
The overview-only emulator seeder preserves both cases. Relationship target tests
include valid and invalid report episode IDs. Ordinary tests 18 passed/4 skipped;
TypeScript, lint and synthetic development build passed (existing bundle warning).

### Moderation type filtering

Added allowlisted comment/user report type filtering using the targetType values
written by Flutter. The constraint runs before the page limit and combines with
status; hash changes reset cursors. Added collection-group indexes for type alone
and type plus status. Queue open-count wording now explicitly says current page.
Browser: dismissed user filter returned empty for the comment-only fixture set;
dismissed comment filter returned both records and survived reload. Populated user
report fixtures still need browser coverage. Tests 19 passed/4 skipped, lint,
TypeScript and synthetic development build passed; bundle warning remains.

### Populated moderation context

Report labels now include the episode's current program title. Program reads are
batched by unique ID in groups of at most 30, after bounded episode lookup; IDs are
validated by the existing relation target helper. Added a closed synthetic user
report under the same userReportTargets path used by Flutter. The overview-only
fixture set now has one open and three closed reports.

Browser verified dismissed + user filters return this report with episode 1,
صباح اليمن, and recorded noAction metadata. Desktop screenshot reviewed: context,
details and decision sections are legible and separate. Tests 19 passed/4 skipped;
TypeScript, lint, synthetic development build and diff whitespace check passed.
Large bundle warning remains. No production data was touched.

### Editorial overview summaries

Added server aggregate counts for draft episodes, active banners expiring in the
next seven days (exclusive now, inclusive end), and active programs whose saved
schedule is explicitly null. Missing legacy schedule fields are not counted; the
copy describes saved empty schedules and confirms schedules are optional. Banner
count includes future-start banners, as stated in the UI. Each card links to its
content list; draft link applies the matching publication filter. Expiry/program
links open active content for review rather than claiming a matching subset.

Overview refresh also refreshes summaries, clearing stale displayed results.
Unavailable reads show unavailable rather than zero. New indexes cover expiry
and null-schedule queries. Browser observed counts 1/0/3 against current fixtures
and draft navigation returned episode 3. Checks: 19 tests passed/4 skipped,
TypeScript, lint, synthetic development build and whitespace check passed.
Expiry positive/boundary fixtures and failure/retry remain pending.

### Editorial aggregate boundary verification

Extracted the exact UI queries into editorial-queries.ts and exercised them with
an isolated emulator test in both HudHudDev and HudHudOfficial. Verified expiry
at now-1ms/now/now+1ms/seven-days/seven-days+1ms, inactive and null-expiry banners,
published/draft/missing publication flags, and active/inactive/missing/null or
populated schedules. Expected count deltas were 1 draft, 2 expiring banners and
1 explicitly unscheduled active program in each root. Test deletes its own random
fixture records in finally and compares to existing counts without clearing data.

Dedicated test passed (1/1). Ordinary suite 19 passed, 5 emulator tests skipped;
lint, TypeScript and synthetic development build passed. Existing bundle warning
remains. Browser failure/retry and positive expiry presentation remain to check.

### Moderation context failure handling

Queue comment lookups now validate episode/comment IDs before constructing a
reference. Invalid paths are skipped and reported on the card, preventing a
malformed report from rejecting the snapshot callback. Cleared stale comment
context when new snapshots arrive. Loading and failed fetches no longer claim
that a comment was deleted; confirmed missing records retain that message.
Decision buttons wait for valid, fully loaded context. Backend transaction
validation remains unchanged.

Unit tests cover invalid and cross-path identifiers. Browser fixture with an
invalid comment path showed the explicit invalid-reference message and all four
actions disabled, while the queue and filters remained usable. The open overview
fixture now intentionally contains that invalid reference. Network failure/retry
still needs browser evidence. Ordinary tests 20 passed/5 skipped; lint,
TypeScript, synthetic development build and whitespace check passed.

### Final timed-banner check and requested quick handoff

Synthetic preview-timing was configured to start at 2026-09-07T19:20:00.055Z
and expire at 19:20:30.055Z. Browser observed visible at 19:20:00.944Z and
expired at 19:20:51.259Z with no intervening reload or data write. Before expiry,
the overview showed one expiring banner. The upcoming state was not captured in
this timed run; earlier static upcoming fixtures were verified separately.

The user requested a quick finish. Current implementation and explicit remaining
work are summarized in [the handoff](admin-web-handoff.md). Full acceptance is
still incomplete; this checkpoint does not claim production readiness.

### Tooling and audience review

Final local validation: all 11 Codex/Gemini hook tests passed; governance and
whitespace checks passed. Codex config TOML, Codex hooks JSON, Gemini settings
JSON and the workspace plugin manifest parsed successfully without printing
configuration values. No setup files were modified by this check.

Audience UI review confirmed users are configured non-creatable, non-editable,
and non-deletable; list rendering uses displayName, role, status and ID rather
than serializing document payloads, email, tokens or phone fields. Representative
audience browser fixtures remain pending. Desktop content row edit/delete targets
now use the shared 48px icon button size, matching primary controls.

Browser DOM measurement confirmed desktop episode edit/delete buttons are each
48×48 CSS pixels. TypeScript, lint and synthetic development build passed.

### App coverage registry review

Reviewed the Flutter screen inventory and Navigator-based entry points rather
than assuming a named route table. Sources include app/app.dart startup gate,
home_screen.dart, station_details_screen.dart, program_details_screen.dart,
episode_comments_screen.dart, account/auth/sign-in/register/manage-account
screens, onboarding_screen.dart, splash/firebase_setup_screen.dart and
notifications_screen.dart. The latter exposes notification preferences and
session messages; it does not establish a persistent remote inbox.

Expanded the coverage UI to eleven content destinations and six explicit
app-owned groups, retaining four public-page links. Browser accessibility tree
confirmed all entries and links render. English localization and release-owned
visual previews remain unfinished. TypeScript and lint passed.

### Successful manual audio preview

Generated a temporary 30-second silent PCM WAV, loaded it into an unsaved station
editor and started playback with the native control's Space key. Browser reported
paused=false, duration=30 and currentTime=6.903 with no media error. Switching to
content fields removed the audio element; reopening preview reported paused=true
and currentTime=0. Existing cleanup explicitly pauses/unloads the prior element.
This verifies decoding/playback progression and reset, not audible speaker output.

Restored the original fixture URL in the draft and invoked cancel/discard; no save
was invoked. The confirmation handle subsequently reported inactive, but browser
focus-emulation timeouts prevented verifying the final closed-dialog DOM. The
480044-byte temporary WAV was removed and was never built or deployed. No source
code change was required. Final dialog visibility remains unverified.

### Final backend checks and token observation

Functions tests: 9 passed; Functions syntax lint passed. Flutter analyze completed
with no issues. Flutter reports the existing Facebook plugin Swift Package
Manager compatibility warning; no platform files changed during analysis.

Admin authentication now observes ID token changes, so refreshed admin claims
are re-evaluated as well as sign-in/sign-out. Each asynchronous token check uses
a generation guard and ignores results from an older event or unmounted effect.
The callback reads the delivered token without forcing another refresh, avoiding
recursive token events. This does not promise instant claim revocation before a
new token arrives; Rules remain authoritative. Interactive refresh/revocation
coverage remains pending. Admin tests 20 passed/5 skipped; TypeScript, lint and
synthetic development build passed.

A scope question is pending with the user: whether to defer English localization
for their requested quick finish. No deferral has been assumed or approved.

### Auth lifecycle regression tests

Extracted the token event resolver into admin-session.ts, used directly by the
admin component. Tests cover late allowed results after sign-out/disposal,
refreshed denied claims, token verification failure, and an older denied result
arriving after a newer authorized session. Denied states clear the user object;
configuration errors also ignore an unmounted effect. Three tests passed; ordinary
suite now 23 passed/5 skipped. TypeScript, lint and synthetic development build
passed. Browser token refresh integration remains unverified, and these tests do
not claim immediate server claim revocation before token refresh.

### Shared admin/Flutter contract fixtures

Added test/fixtures/admin-content-contract.json containing canonical records for
all five editable content kinds. The admin test validates each and verifies the
payload retains the expected editable fields while excluding stats. The Flutter
test reads the same fixture, performs only ISO-to-Firestore-Timestamp conversion,
and invokes all five production mappers. It checks parent IDs, HTTP station
streams, optional schedule null, a midnight end of 1440, draft publication state,
UTC offset/date and banner target/expiry. Both tests passed. This is shared data
contract evidence, not a claim that Flutter screens were visually compared after
a real admin save; that broader check remains pending.

Latest admin suite: 24 passed/5 skipped; targeted Flutter contract test 1 passed;
TypeScript and lint passed. Existing Facebook plugin SPM warning remains. Only
tests/fixtures and this audit changed in this checkpoint.

### Combined emulator regression and counter review

Ran all five dedicated admin emulator scenarios sequentially against the local
preview demo project: all passed, no skips (20.2 seconds). Rules permission-denied
messages were expected negative assertions in the episode deletion scenario.

Subsequent save review added a counter guard before parent increments/decrements
in content creation/moves and program deletion. It rejects missing, fractional,
negative, nonnumeric or unsafe counters and prevents decrement below zero; it
never silently repairs counts. Unit coverage passed for valid changes, underflow,
malformed data and overflow. This does not yet cover the separate episode cleanup
or moderation counter paths, and the existing emulator helpers do not directly
exercise the UI save wrapper. Latest ordinary suite 25 passed/5 skipped;
TypeScript, lint and synthetic development build passed.

### Episode/moderation count guards

Applied the same nonnegative counter guard inside episode final-deletion and
comment moderation transactions. New emulator assertions in both roots prove a
zero parent count rejects deletion, preserves the episode/count and releases the
temporary deletion token; a zero comment count rejects moderation and preserves
both published comment and open report. Existing concurrency/retry scenarios
still pass: all five emulator scenarios passed, no skips. Ordinary suite 25
passed/5 skipped; TypeScript, lint and synthetic development build passed.

### Stable stale-edit and retry fingerprints

Save retry/stale-edit comparison and non-episode deletion comparison now
canonicalize nested map keys after Timestamp conversion. This prevents identical
content being rejected solely because Firestore returns schedule fields in a
different insertion order. Arrays retain order; changed editable values still
conflict. Tests verify map order, real title/schedule changes, timestamp equality,
and preserved server-only metadata/counter updates excluded from save conflicts.
Ordinary suite 26 passed/5 skipped; TypeScript, lint and synthetic development
build passed. Direct save-transaction emulator coverage remains pending.

### Production save-transaction emulator coverage

Moved saveWithRelations into save-content.ts, called by the unchanged guided
editor flow with its selected root and template counter defaults. The helper
validates exact content collection/root, matching previous reference, and city
reference root. Existing relationship/counter logic remains in the transaction.

New direct emulator scenario in both roots verifies creation, identical retry
with reordered nested map keys, single counter increment, stale-edit rejection,
rejected underflow with no partial move, successful atomic parent transfer,
unknown metadata preservation, and cross-root rejection. All six admin emulator
scenarios passed (20.5 seconds). TypeScript, lint and synthetic development build
passed. This directly covers the save helper used by the UI, extending earlier
standalone relationship helper evidence. Browser save after extraction remains
a final integration check.

### Browser save integration and mobile follow-up

The prior preview tab was confirmed missing, so opened a new local preview tab
(10257782). Existing synthetic admin authentication restored successfully. Created
banner UI3Dfcxv2wm5XYzq7Tz1 via the guided form, observed success and its list row,
reloaded, reopened it, disabled it and saved successfully. This exercises the UI
wiring to the extracted save helper for creation and editing. The synthetic banner
remains disabled; no production connection was used.

At 360×800, reviewed the banner-card screenshot and measured document scrollWidth
360 at innerWidth 360. The edited banner showed disabled status. Mobile section
selection navigated to coverage, which also measured 360/360 with the expected
heading. Restored desktop viewport and retained the new preview tab. No application
code changed in this verification checkpoint.
