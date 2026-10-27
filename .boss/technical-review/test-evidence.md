# HudHud FM — Automated Test Evidence & Verification Log
**Verification Date:** October 27, 2026  
**Git Commit Baseline:** `10fd50998b6f07129189eb3a4f35ff7749dbafe7` (with `COMPAT-04-T12` test patch)  
**Target Environment:** Local Firebase Emulators & Mock Tooling (Demo Mode)  
**Node.js Version:** v22.23.3 (via `/Users/ibrahimqassem/.npm/_npx/52027bd8fc0022aa/node_modules/node/bin/node`)  
**Flutter / Dart SDK:** Flutter 3.47.5 (Channel stable), Dart 3.13.4  
**Firebase CLI:** 15.30.2  

---

## 1. Executive Test Scorecard

| Test Suite / Gate | Execution Command | Tests Run | Pass | Fail | Skip | Duration | Exit Code | Status |
|---|---|---|---|---|---|---|---|---|
| **Subscriptions Emulator (B16 Gate)** | `npm run emulators:subscriptions` | 18 | 18 | 0 | 0 | 30.8s | `0` | **PASS (GREEN)** |
| **Admin Emulators Suite** | `npm run emulators:admin` | 43 | 43 | 0 | 0 | 81.8s | `0` | **PASS (GREEN)** |
| **Email Verification Suite** | `npm run emulators:email-verification` | 14 | 14 | 0 | 0 | 11.6s | `0` | **PASS (GREEN)** |
| **Firestore Security Rules** | `npm run emulators:test` | 78 | 78 | 0 | 0 | 28.3s | `0` | **PASS (GREEN)** |
| **Cloud Functions Unit & Integration** | `cd functions && npm test` | 413 | 413 | 0 | 0 | 4.5s | `0` | **PASS (GREEN)** |
| **Functions Code Check / Lint** | `cd functions && npm run lint` | 23 files | 23 | 0 | 0 | 1.8s | `0` | **PASS (GREEN)** |
| **Migration, Seed & Reconcile Tools** | `node --test tool/test/*.test.mjs` | 489 | 489 | 0 | 0 | 441.7s | `0` | **PASS (GREEN)** |
| **Web Admin Pure Unit Tests** | `cd web_admin && npm test` | 140 (evaluated) | 115 | 0 | 25* | 3.9s | `0` | **PASS (GREEN)** |
| **Web Admin Code Check / Lint** | `cd web_admin && npm run lint` | 97 files | 97 | 0 | 0 | 1.5s | `0` | **PASS (GREEN)** |
| **Web Admin Production Build** | `cd web_admin && VITE_FIRESTORE_ROOT=HudHudOfficial npm run build` | Bundle | Pass | 0 | 0 | 0.79s | `0` | **PASS (GREEN)** |
| **Web Listener Typecheck** | `cd web_hudhud && npm run typecheck` | TypeScript | Pass | 0 | 0 | 2.1s | `0` | **PASS (GREEN)** |
| **Web Listener Code Check / Lint** | `cd web_hudhud && npm run lint` | 48 files | 48 | 0 | 0 | 0.05s | `0` | **PASS (GREEN)** |
| **Web Listener Unit Tests** | `cd web_hudhud && npm test` | 83 | 83 | 0 | 0 | 8.5s | `0` | **PASS (GREEN)** |
| **Web Listener Production Build** | `cd web_hudhud && VITE_FIRESTORE_ROOT=HudHudOfficial npm run build` | Bundle | Pass | 0 | 0 | 0.51s | `0` | **PASS (GREEN)** |
| **Flutter Static Analysis** | `flutter analyze --no-pub` | Workspace | 0 issues | 0 | 0 | 33.0s | `0` | **PASS (GREEN)** |
| **Flutter Full Test Suite** | `flutter test --no-pub` | 397 | 397 | 0 | 0 | 38.0s | `0` | **PASS (GREEN)** |
| **TOTAL UNIQUE VERIFIED TESTS** | — | — | **1,650** | **0** | **0** | — | `0` | **100% LOCAL GREEN** |

*\*Precise Audit Note on Web Admin Test Numbers:*  
When running `cd web_admin && npm test` without emulators, 115 pure unit tests execute and pass. 25 test suites (matching `*.emulator.test.ts`) are skipped due to `{ skip: !process.env.FIRESTORE_EMULATOR_HOST }`. Those exact 25 test suites execute under `npm run emulators:admin` with emulator fixtures and subtests, producing exactly 43 passing assertions (and 0 skips). Thus, Web Admin has 158 total unique passing tests (115 unit + 43 emulator). Across the entire repository, exactly 1,650 unique passing test assertions were executed and verified (18 + 43 + 14 + 78 + 413 + 489 + 115 + 83 + 397 = 1,650). Zero duplicate counts and zero uncredited skips exist in this total.

---

## 2. Gate B16: Subscriptions Emulator Verification

**Test File:** `firebase_tests/firebase-emulators/station-subscriptions.test.js`  
**Associated Governance:** `COMPAT-04-T12-SUBSCRIPTIONS-FIXTURES`  
**Command:** `export PATH="/Users/ibrahimqassem/.npm/_npx/52027bd8fc0022aa/node_modules/node/bin:$PATH" && npm run emulators:subscriptions`

### Baseline Failure Log (Pre-Patch)
```text
✖ failing tests:
test at firebase_tests/firebase-emulators/station-subscriptions.test.js:122:1
✖ PKG-08: profile self-healing and support for listener, station_admin and super_admin (35.5923ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected
  + undefined
  - 'healed@hudhud.fm'
      at TestContext.<anonymous> (station-subscriptions.test.js:144:10)

test at firebase_tests/firebase-emulators/station-subscriptions.test.js:224:3
✖ HudHudDev: program claims serialize, known failures retry and lost acknowledgement never resends (13.954604ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  0 !== 1
      at TestContext.<anonymous> (station-subscriptions.test.js:231:12)

test at firebase_tests/firebase-emulators/station-subscriptions.test.js:224:3
✖ HudHudOfficial: program claims serialize, known failures retry and lost acknowledgement never resends (7.640596ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  0 !== 1
      at TestContext.<anonymous> (station-subscriptions.test.js:231:12)

ℹ tests 18 | pass 15 | fail 3 | cancelled 0 | skipped 0
Exit code: 1
```

### Remediation Applied (Under Path Lock `I`)
1. **Line 144:** Corrected expectation to `assert.equal(healedProfile.get('email'), undefined)` honoring accepted contract R10 (Firestore listener profiles must not store emails; Auth is sole authority).
2. **Line 207:** Added station `s` seeding in `HudHudOfficial` to satisfy `visible(station)` check in notification delivery.
3. **Line 227:** Completed fixture schedule with `endMinute: 660, utcOffsetMinutes: 180` to satisfy production validator `normalizedSchedule` per C04/R13.
4. **Line 246:** Corrected cleanup assertion to verify retention of the 3 program notification operations (2 `sent`, 1 `unknown`), as `collectNotificationOperations` purposefully removes only `broadcast_` documents.

### Post-Patch Verification Log (Exit Code: 0)
```text
✔ both roots normalize legacy duplicates, preserve timestamps and reject disabled profiles (8520.967362ms)
✔ device ownership transfers, unregister is owner-only and deletion cleans registrations (104.355216ms)
✔ publication retries send once, edits/republication do not enqueue again, opt-out is respected (3656.776536ms)
✔ transient send failures retry and invalid tokens are removed (251.742219ms)
✔ device and delivery collections are private even to admin clients (532.17194ms)
✔ audience pagination resumes beyond the first 25 records without duplicate sends (2603.077974ms)
✔ canonical and latest legacy opt-outs override older active duplicate records (140.566758ms)
✔ PKG-08: profile self-healing and support for listener, station_admin and super_admin (92.189383ms)
✔ HudHudDev: lost episode acknowledgement stays unknown across retries (118.018804ms)
✔ HudHudDev: an expired job lease cannot start a second in-flight device send (150.194556ms)
✔ HudHudOfficial: lost episode acknowledgement stays unknown across retries (104.809712ms)
✔ HudHudOfficial: an expired job lease cannot start a second in-flight device send (149.278538ms)
✔ HudHudDev: program claims serialize, known failures retry and lost acknowledgement never resends (276.998832ms)
✔ HudHudDev: native delivery transaction admits one lease and fences an expired sending attempt (3046.490421ms)
✔ HudHudOfficial: program claims serialize, known failures retry and lost acknowledgement never resends (252.527085ms)
✔ HudHudOfficial: native delivery transaction admits one lease and fences an expired sending attempt (3086.426377ms)
✔ HudHudDev: manual broadcasts serialize, preserve unknown and recover acknowledged history writes (3567.864606ms)
✔ HudHudOfficial: manual broadcasts serialize, preserve unknown and recover acknowledged history writes (3205.307155ms)
ℹ tests 18
ℹ suites 0
ℹ pass 18
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ duration_ms 30855.935949
✔ Script exited successfully (code 0)
```

---

## 3. Station Private Metadata & Rules Verification (R01)

**Execution Command:** `npm run emulators:admin`  
**Execution Time:** 81.82s  
**Exit Code:** `0`  

### Key Verified Assertions
- `R01 admin helpers read canonical private state, enforce stale revisions and delete both projections` (Passed in 717ms)
- `R01 scoped admin cannot load station private metadata through the SDK helper` (Passed in 723ms)
- `R01 offline private reads reject without returning cached metadata or changing either projection` (Passed in 729ms)
- `R07 existing users aggregate route provides counts to verified active scoped administrators` (Passed in 772ms)
- `R07 real callable rejects guest, listener, forged request roles and revoked current authority` (Passed in 875ms)
- `R06 existing resource request provides bounded ordinary pages and reaches record2001` (Passed in 175ms)

---

## 4. Flutter Quality & Test Suite Verification

### Static Analysis
**Command:** `flutter analyze --no-pub`  
**Result:** `No issues found! (ran in 33.0s)`  
**Exit Code:** `0`

### Unit and Widget Tests
**Command:** `flutter test --no-pub`  
**Result:** `All tests passed! (397 passed in 38s)`  
**Exit Code:** `0`  
**Key Covered Areas:**
- `station_player_controller_test.dart`: Sleep timer generation binding, session preservation across switches, zero-seek on replay of completed audio episodes (R02, R03).
- `content_pagination_test.dart`: Compound query ordering by `publishedAt desc`, pre-filter limits (R04).
- `account_controller_test.dart` & `auth_screen_test.dart`: Distinction between account creation and verification code dispatch failure (R05).
- `station_card_test.dart`: 20px luxury station cards, dynamic type scaling, RTL layout.
- `now_playing_sheet_test.dart`: Sleep timer modal, cancel action survival across episode switch.
