# Compatibility Attachment: COMPAT-04-T12-SUBSCRIPTIONS-FIXTURES
**Document ID:** `COMPAT-04-T12-SUBSCRIPTIONS-FIXTURES`  
**Governing Work Order:** `WO-04`  
**Batch / Milestone:** `B16` / `04-T12`  
**Registered Ownership:** `I` (Parent Integration Authority)  
**Registered File Scope:** `firebase_tests/firebase-emulators/station-subscriptions.test.js`  
**Date:** October 27, 2026  
**Status:** REGISTERED & APPROVED FOR COMPATIBILITY REMEDIATION  

---

## 1. Context & Scope Justification

During execution of the mandatory automated gates for `B16`, the subscription emulator suite at `firebase_tests/firebase-emulators/station-subscriptions.test.js` failed with **15 passed and 3 failed** out of 18 tests (recorded in `B16-mandatory-gate-stop-review.md`).

Static and runtime analysis confirmed that:
1. `firebase_tests/firebase-emulators/station-subscriptions.test.js` was historically classified outside the baseline `04-T12` write set.
2. The 3 test assertion failures are **fixture compatibility discrepancies** against accepted contracts [R10](tech-review.md#r10--p2-resolve-listener-email-persistence-against-the-privacy-contract) and [R13](tech-review.md#r13--p2-use-each-schedules-utc-offset-for-program-alerts), rather than product defects:
   - **Assertion 1 (Line 144):** The fixture asserts `healedProfile.get('email') === 'healed@hudhud.fm'`. This expectation directly violates privacy contract R10, which strictly disallows persisting listener email addresses in Firestore.
   - **Assertion 2 & 3 (Lines 224–231):** The program notification claim tests in `HudHudDev` and `HudHudOfficial` define a partial schedule `{ weekdays: [1], startMinute: 600 }` omitting `endMinute` and `utcOffsetMinutes`, causing the production validator `normalizedSchedule` to reject the schedule as invalid per C04/R13. Station `s` was also not seeded in `HudHudOfficial`.
   - **Latent Assertion 4 (Line 246):** The cleanup test asserts `empty: true` on `notificationOperations`. Production function `collectNotificationOperations` purposefully purges only `broadcast_` documents, preserving program notification receipts (`sent`/`unknown`) for deduplication across the cutover period.

## 2. Authorized Path Lock & Integration Rules

- **Path Lock:** An exclusive write lock is granted to **`I` (Parent Integration Authority)** on `firebase_tests/firebase-emulators/station-subscriptions.test.js`.
- **Constraint 1:** No production code or security rules may be weakened to accommodate obsolete test expectations.
- **Constraint 2:** Assertions must be corrected to reflect accepted contract invariants:
  - Assert `healedProfile.get('email') === undefined` per R10.
  - Complete the schedule fixture with `endMinute: currentMinute + 59` and `utcOffsetMinutes: 180` per C04/R13, and ensure station `s` is seeded in both roots.
  - Assert preservation of the 3 program notification receipts (2 `sent`, 1 `unknown`) following `collectNotificationOperations`.
- **Constraint 3:** No tests may be skipped, commented out, or bypassed. All 18 tests must execute and pass.
