# B11 independent technical and security review

Date: 2026-10-26. Reviewer: independent `b10_review` agent; no implementation authorship.

## Verdict

**REVISION_NEEDED. B11 verified interim handoff is BLOCKED.** Two source issues and a failed actual SDK gate require correction and affected verification. R06/R07 remain OPEN. No application source changes, emulator execution, Flutter process, production operation or deployment was performed by this reviewer.

## Blocking issues

1. **Privacy — manifests serialize personal search text.** `web_admin/lib/export-pages.ts:31` assigns raw `state.identity` to downloaded `queryFingerprint`. The actual UI identity at `admin-app.tsx:1752` contains free-text search. `exportCurrentPage` repeats the raw identity at line1878. A name/email/phone searched by an administrator is therefore copied into downloadable JSON, contrary to the no-personal-data manifest requirement. Independently executed the actual export helper using a synthetic email identity and asserted that serialized output exclude it; this failed with `ERR_ASSERTION: Export manifest must not retain raw personal search text`. Replace exported identity with a deterministic opaque one-way digest; retain raw matching identity only in private in-memory state. Cover both full and current-page manifests with permanent pre-fix regression evidence. The initial reviewer probe used an incorrect relative import and produced module-not-found; that attempt is excluded and provides no RED credit. The corrected probe executed successfully before its intended business assertion failed.

2. **Correctness — cached snapshots mint traversal cursors.** ResourcePage's snapshot callback always derives `last` and `more` from the first50/51 cached documents before setting `cached`. The Next control at `admin-app.tsx:1290` checks only loading/more/last, and its handler likewise ignores cached state. A cache-only/incomplete snapshot can therefore authorize next-page traversal from its last cached row and skip records that were never server-validated. Cache-first display is allowed; server continuation must not originate from cache. Require an actual-component regression for cache-only51 rows, server transition and later offline/cache transitions, plus guarded handlers so stale callbacks cannot advance traversal even before React repaint. Preserve existing successful content and disclose offline state.

3. **Mandatory actual emulator gate failed.** Parent log `evidence/WO-03/B11-emulator-green.log` currently reports **41 tests,38 passed,3 failed,0 skipped**. Both roots' R06 record2001 continuation child cases throw `Invalid query. Expected a string for document ID in startAfter(), but got a object`; the parent case fails consequently. This is an SDK integration failure, not valid behavioral RED or GREEN. Determine the actual DocumentReference/document-ID boundary or SDK instance cause, correct it without weakening reachability assertions, and rerun the full affected actual gate. The coordinator owns this investigation/runtime.

## Other reviewed behavior

The aggregate endpoint validates an exact root-only request, requires token admin authority and supported role, rechecks current Auth disabled/verification/admin/role state, and returns count/root/asOf only. It does not download profile data or trust body roles. Existing scoped profile-list restrictions remain. The exact finite query whitelist, root bounds,50 consumed/51 lookahead, scan200/read batch,100 visible scan matches, frozen health evaluation, relation hydration, truthfully scoped labels and canonical private-station export projection are present. Full-export part state stays bounded and advances after successful writer return; interrupted writes explicitly disclose possible repeated downloaded parts. Source-level improvements do not waive the blockers above.

## Verification and evidence limits

Independent Node22 focused command from web_admin: `node --experimental-strip-types --test test/user-count.test.ts test/resource-pagination.test.ts test/export-pages.test.ts`: **11 passed,0 failed,0 skipped**. Reviewer log `/tmp/hudhud-b11-independent-focused.log`. Passing pure tests do not cover the manifest or cached actual-component defects. Inspected Node22 provenance:259 Functions passes;106 ordinary admin passes and23 emulator skips. Skips receive no acceptance credit. Earlier Node26 mandatory-gate runs remain excluded. Parent owns full corrected gates and actual integration. The original17 identities, B15 worker/harness integration, browser downloads/cancel/resume, full Flutter and physical devices remain obligations. No finding is CLOSED.

## Reviewed fingerprints

| File | SHA-256 |
|---|---|
| `functions/lib/admin-user-count.js` | `1b30bbb90e37ed83cf0622304eb11dbca966e46f8fea7ac2d1d90e289a9eb086` |
| `functions/test/admin-user-count.test.js` | `0c0325f13f16d21d6593d297bc2d7ee298a90bb47fa035880de1723bf91bfab8` |
| `functions/index.js` | `9fc086e98fd1e0c12265dfa36f96418536f8ecacd7c93995b165cc26e0d72714` |
| `web_admin/lib/user-count.ts` | `ec89c2a4ead0c844bb242648bd2dc25cf2d8ccc4c77f8d3bf0fb260c39fcf0cd` |
| `web_admin/test/user-count.test.ts` | `d76e737c39878c0bdbf5eb2763379e0c9d714afceb1a12844c4228370f4bc3c4` |
| `web_admin/components/admin/users-aggregate-view.tsx` | `f54df8a5cf7b4a0778884f8b53b7792ef75368f30ffa15196f11ad9e43907875` |
| `web_admin/lib/admin-query.ts` | `556fe049f7cf79b160b2d5688f16fe894bc289400e1dd8623584b367938ff91b` |
| `web_admin/lib/resource-pagination.ts` | `afa7b53a6cf44150bea665669fe3ccb4d63eec553917fac45795975222b9b612` |
| `web_admin/lib/resource-filters.ts` | `46c17de52d37ef96effdec62418c238b803faf47d08f19e41bef24f441002ee3` |
| `web_admin/test/resource-pagination.test.ts` | `db44c1f61358f85288020bd5634d910991d2d7017762447b6b48b868663ae333` |
| `web_admin/test/content-pagination.emulator.test.ts` | `3c310f2ea140eb2e849a17b3ed38f98b3697a4ebfc158d91cea8c57f55c228a2` |
| `web_admin/components/admin/admin-app.tsx` | `3f9051ebd67c68f9266252927e99f5958762916f66da895d08d534b5114b0f47` |
| `web_admin/lib/export-pages.ts` | `ffcaf63947e7b56024332e1e5bcea30c1393b94619109d320c2de7b17d83121e` |
| `web_admin/test/export-pages.test.ts` | `8c958d8220276fad62b7c2e9e681c803600d173c060993b9d37b309f6f98ed97` |
| `web_admin/test/user-count.emulator.test.ts` | `0d9360f3746594aab15485f1a4ab2e4d96da9c879e522faac49b72b49a3579eb` |


## Independent correction re-review — 2026-10-26

**APPROVED for verified interim handoff.** All three prior B11 blockers are verified corrected in this candidate; original findings/failures remain above. R06/R07 remain OPEN pending applicable final acceptance.

Both full and page/visible-scan manifests now serialize deterministic SHA-256 opaque fingerprints only. Raw identity stays in memory for query matching. The actual UI uses the corrected manifest builders, checks generation/cancellation after asynchronous digest creation before downloading or advancing feedback, and fails safely if digest creation fails. Existing bounded file-write checkpoints, canonical private projection and no legacy fallback remain.

Ordinary document-ID continuation now uses the last document ID string; collection-group continuation uses its validated full path string. Root/filter/resource/order binding and last-consumed raw continuation remain intact. Actual SDK construction and both-root record2001 traversal now pass rather than throwing the prior DocumentReference boundary error.

The actual snapshot callback invokes the reviewed cache boundary helper. Cache-only data never produces last/hasMore traversal authority; cached snapshots preserve previous successful server rows and avoid relation-hydration I/O. Both Next disabled state and its handler consult the same cache/loading/cursor guard. Server snapshots restore bounded traversal. Existing authorization/deletion isolation and S01 shortcuts are preserved.

Independent Node22 focused tests: `node --experimental-strip-types --test test/user-count.test.ts test/resource-pagination.test.ts test/export-pages.test.ts`: **20 passed,0 failed,0 skipped**; reviewer log `/tmp/hudhud-b11-independent-rereview.log`. Inspected permanent privacy2-assertion and boundary5-child-assertion pre-fix RED, their positive control/parent-failure classification, corrected Node22 full admin115-pass/23-skipped evidence, lint/typecheck/build and unchanged259-pass Functions evidence. Ordinary23 emulator skips have no acceptance credit. Inspected actual coordinator emulator gate: **41/41 passed,0 failed,0 skipped**, successful script exit/shutdown, including count authority/security and both-root pagination.

Browser downloads/pause/resume, B15 integrated worker/harness acceptance, exact merged-candidate project gates, original17 test identities, full Flutter/device obligations and production approvals remain separate. No source modification, E/F run or finding closure by this reviewer.

| Corrected input | SHA-256 |
|---|---|
| `functions/lib/admin-user-count.js` | `1b30bbb90e37ed83cf0622304eb11dbca966e46f8fea7ac2d1d90e289a9eb086` |
| `functions/test/admin-user-count.test.js` | `0c0325f13f16d21d6593d297bc2d7ee298a90bb47fa035880de1723bf91bfab8` |
| `functions/index.js` | `9fc086e98fd1e0c12265dfa36f96418536f8ecacd7c93995b165cc26e0d72714` |
| `web_admin/lib/user-count.ts` | `ec89c2a4ead0c844bb242648bd2dc25cf2d8ccc4c77f8d3bf0fb260c39fcf0cd` |
| `web_admin/test/user-count.test.ts` | `d76e737c39878c0bdbf5eb2763379e0c9d714afceb1a12844c4228370f4bc3c4` |
| `web_admin/components/admin/users-aggregate-view.tsx` | `f54df8a5cf7b4a0778884f8b53b7792ef75368f30ffa15196f11ad9e43907875` |
| `web_admin/lib/admin-query.ts` | `556fe049f7cf79b160b2d5688f16fe894bc289400e1dd8623584b367938ff91b` |
| `web_admin/lib/resource-pagination.ts` | `f1919a712e3613119a84f41dfd81121675f244b0215ae35bd1c4cb0c840de0bb` |
| `web_admin/lib/resource-filters.ts` | `46c17de52d37ef96effdec62418c238b803faf47d08f19e41bef24f441002ee3` |
| `web_admin/test/resource-pagination.test.ts` | `8013fc9dad7f80f3b23f067d00ee3860c329210c53f3dd9f6f006daa2e3d2fd3` |
| `web_admin/test/content-pagination.emulator.test.ts` | `3c310f2ea140eb2e849a17b3ed38f98b3697a4ebfc158d91cea8c57f55c228a2` |
| `web_admin/components/admin/admin-app.tsx` | `f654f3fd7426e6f4df03379214a72050fb9bde5e508efced8ee419b24caafb1d` |
| `web_admin/lib/export-pages.ts` | `499ec9691cfda9992b21e5a0a1f8edbdd59689d25bbe828f5021df2063db5753` |
| `web_admin/test/export-pages.test.ts` | `31a8d5534de93335b5a545618d5b716bb66f58782df7fa6a30839894816af5e1` |
| `web_admin/test/user-count.emulator.test.ts` | `0d9360f3746594aab15485f1a4ab2e4d96da9c879e522faac49b72b49a3579eb` |
| `tool/run-admin-emulator-tests.mjs` | `73276b3ebe6734a955e97370b359392a8dca1c2c8a44ca03e67c85c8ef7a54bf` |
| `.boss/technical-review/evidence/WO-03/B11-review-emulator-green.log` | `b0d3ba4cb7662e481f77cc09833e6a304bf3432888f251bd4276cada0169db19` |
