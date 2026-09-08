# Flutter development acceptance audit

Date: 2026-09-08  
Plan: [Flutter app development plan](flutter-app-development-plan.md)  
Status: Implementation active; locally verified slices and remaining evidence below. App release excluded.

This is the requirement-level completion inventory. Source evidence and passing
existing tests do not mark planned fixes or visual/device checks complete.
Use `Pending`, `In progress`, `Verified`, or `Blocked` with a concrete reason.

| Requirement | Card | Status | Required evidence |
| --- | --- | --- | --- |
| Baseline screenshots and synthetic screen/state fixtures | FL-00 | Verified for synthetic screen matrix | Before/after captures in `build/review/continuation`; 430×932 at 100%, 360×800 at 200%, Arabic/English; native fonts remain unverified |
| Reconcile contract/proposal discrepancies F11 | FL-00 | Verified locally | Earlier contract amendments plus corrected historical proposal status; ADR 0003 owns station follows/alerts |
| Clear existing analyzer lint | FL-00 | Verified | Add braces at `test/admin_content_contract_test.dart:26`; analyzer clean |
| Favorites reset on account change and reject stale completions | FL-01 | Verified | A→B/logout with delayed events and pending writes |
| Per-target favorites concurrency and verification transitions | FL-01 | Verified | Duplicate taps, two targets, failed rollback, same-UID verification |
| Home optional initialization failures cannot block discovery | FL-02 | Verified | Preference/user failure and disposed initialization tests |
| Home/content refresh and user state ordering | FL-02/FL-07 | Verified for cache/refresh/layout races | Late cache, reversed refresh success/failure, disposal, and late saved layout regressions; previous user-request generation retained |
| Playback replacement/stop/disposal races | FL-03 | Verified in controller tests | Delayed loads and stale errors cannot restart or overwrite current selection |
| Correct station versus episode media metadata | FL-03 | Implemented; device observation pending | Domain/data test plus platform metadata observation |
| Physical playback behavior | FL-03 | Pending | Background/lock, focus loss, headset, Bluetooth, network loss and retry on affected platforms |
| Correct localized episode sharing and plugin failure behavior | FL-04 | Implemented; payload tests pass | Program title distinct from station; no raw media URL; Arabic/English tests |
| Banner and schedule clock/resume boundaries | FL-04 | Verified locally | Banner start/expiry, shrink and resume; station clock aligns to minute boundary and refreshes across days on resume |
| Home/details/program/player visual acceptance | FL-05 | Synthetic matrix verified; native review pending | Header/link/stat overflows repaired, stable highlighted episode order, player present in captures; image/network behavior on devices remains pending |
| Auth/profile/account recovery and accessibility | FL-06 | Verified locally; native provider checks pending | Account/sign-in/register captures and keyboard checks; cancellation, profile retry, deletion retry plus existing validation/verification tests |
| Camera/gallery physical behavior | FL-06 | Pending | Permission denial, cancel, selection/capture, upload failure/retry |
| Comments and admin moderation parity | FL-06 | Verified at Flutter boundary | Published-only mapping fixture rejects hidden/removed/unknown; existing consent/report/block/undo tests retained; no admin/backend changes this continuation |
| Notifications recover after partial initialization failure | FL-06 | Verified with messaging fake | Partial failure/retry, concurrent initialize, listener cleanup, disposal during initial-message retrieval; no permission/token call during initialization |
| Screen reader, touch targets and reduced motion | FL-05/FL-06 | Partially verified | My Stations Android tap-target and label guidelines pass; grid favorite target enlarged to 48px; banner indicator respects reduced motion; physical TalkBack/VoiceOver/focus review pending |
| Large catalog measurement and pagination decision | FL-07 | Measured locally; pagination deferred | 100/1,000/10,000 episode mapping+sort samples and source-based returned-document estimate; no network/billing/performance-on-device claim |
| Final development regression and handoff | FL-08 | See continuation handoff | Final command results and remaining device limits in [continuation handoff](flutter-continuation-handoff.md); no release tasks |

## Baseline checks

| Check | Result on 2026-09-08 |
| --- | --- |
| Initial Git state | Clean at `cad18cb` |
| Governance | Passed |
| Flutter tests | 132 passed |
| Flutter analysis | Exit 1: one existing info lint, `curly_braces_in_flow_control_structures`, `test/admin_content_contract_test.dart:26:11` |
| Toolchain | macOS host; Flutter 3.44.0 stable, Dart 3.12.0; unit/widget tests |
| Documentation checks | Governance and `git diff --check` passed |
| Debug builds | Not run: documentation-only review |
| Emulator suites | Not run: no backend/Rules changes |
| Visual/device acceptance | Not run; all relevant rows remain pending |

## Subscription implementation evidence

| Requirement | Status | Evidence |
| --- | --- | --- |
| Station follow/unfollow with alerts off by default | Verified locally | Controller and widget tests; confirmed callable writes |
| Guest/unverified gates and permission denial | Verified locally | Guest/verification/controller/device tests; following survives denial |
| My Stations and unavailable references | Verified locally | Widget journey covers account gate, loading, empty, error/retry, offline, unavailable/unfollow, and identity reset |
| Canonical/legacy normalization and opt-out precedence | Verified in emulator | Both roots, concurrent saves, earliest timestamp and stale active records |
| Account/device ownership and private storage | Verified locally | Ownership transfer, owner-only unregister, private Rules and logout tests |
| Account deletion cleanup | Verified in emulator | Existing callable suite asserts device record and ownership removal |
| Publication queue, retry and audience pagination | Verified with fake sender | First publication, duplicate/republication, opt-out, partial failure, invalid token and >25 records |
| Foreground/background/cold-start navigation | Verified locally; real device pending | Repository initialization message tests plus routing destination/fallback/offline/duplicate/disposal tests; no autoplay |
| Arabic/English 200% follow controls | Widget-verified | 360×800 tests and synthetic screenshots; local font substitute, not native typography proof |
| Real FCM receipt | Pending external development setup | No deployment or actual send authorized/performed |

The broad visual/device rows above remain authoritative. A successful local build
or fake sender is not evidence of real OAuth, push, camera or audio behavior.
Current command results are in [the development handoff](flutter-subscriptions-handoff.md).



## Latest local verification — 2026-09-08

153 Flutter tests, clean analysis/formatting, Android debug and iOS simulator builds,
13 Functions tests, 7 subscription emulator scenarios, 25 Rules tests and 3 account
deletion scenarios pass. Governance/whitespace checks pass. This supersedes the
baseline lint finding while preserving the outstanding visual/device requirements.

## Continuation evidence

See [Flutter continuation handoff](flutter-continuation-handoff.md) for the latest
verification, measured catalog costs, file inventory, screenshot limits and
remaining physical-device checks. Earlier command counts above describe the
subscription implementation checkpoint.
