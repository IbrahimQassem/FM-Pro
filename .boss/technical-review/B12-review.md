# B12 independent technical review

Date: 2026-10-26. Reviewer: independent `b10_review` agent; no implementation authorship.

## Verdict

**APPROVED for verified interim source handoff.** No blocking source correctness, security or architecture issue found in the reviewed candidate. R08 remains OPEN until applicable final acceptance. No production migration, index deployment, rollout or finding closure is approved.

## Review conclusions

- Repository queries scope root, station, active/published state and selected parent before limiting. Each page reads at most51 raw records, consumes50, and derives continuation from the last consumed raw record rather than the lookahead or last mapped row. Empty mapped pages retain continuation.
- Program ordering preserves featured/priority/title/ID; episode ordering uses broadcastAt/priority/ID. Cursors bind version/root/resource/station/program/order and serialize bounded Firestore-compatible sort values. Timestamp seconds/nanoseconds are retained and reconstructed with the SDK Timestamp constructor, without millisecond conversion.
- Cache reads use the same query identity and yield offline pages without server continuation. Cache cursors cannot advance server traversal. The mapper retains the existing visibility, deletion and parent checks.
- Distant links validate station, episode and program through at most three direct server document reads. They do not traverse the archive or start playback. Invalid links remain unavailable and stale cache cannot bypass direct-link validation errors.
- UI replaces windows rather than accumulating archive rows. Episode DOM is capped at100, ordinary pages are50, and back-cursor history is bounded at20. Canonical program episode counts are independent of loaded-page length. Page failures preserve successful content; retry repeats the failed action. Station generations and in-flight guards reject stale or duplicate completions. Explicit refresh discloses concurrent insert/delete pagination semantics rather than promising snapshot isolation.
- Actual TSX behavior tests exercise page navigation, retries, station races, offline controls, parent switches, distant selection, timer ticks and no-autoplay. These tests substitute the hook scheduler and ports; they do not replace real browser acceptance.
- The public-home integration preserves the approved S01 platform shortcuts. No new dependency, privileged write or state-management architecture was introduced.

## Verification and evidence limits

Independently executed Node22 from `web_hudhud`: `node --experimental-vm-modules --experimental-transform-types --test test/*.test.mjs`: **78 passed, 0 failed, 0 skipped**. Reviewer log: `/tmp/hudhud-b12-independent-full.log`. This includes the actual repository VM fixture traversing10000 synthetic episodes via200 bounded continuation actions and the actual TSX behavior cases.

Inspected retained coordinator/author `B12-provenance.json`, primary `B12-red.log`, final lint/build evidence and their classification. The primary pre-fix repository RED is a business assertion after successful module execution: the old initial query downloaded the10000-record archive. The later unchanged-baseline UI replay corroborates the DOM issue but is correctly not credited as primary RED-before-fix. Interface/preview compilation failures and shell mistakes are not valid RED. Final owning lint, typecheck and build logs show success; deployed-index readiness is not established by a local build or emulator.

Browser/mobile/physical-device journeys, exact merged-candidate integration, the original17 emulator acceptance identities, later B15 integration and separate operational data/index readiness remain mandatory where applicable. Independent approval is limited to the exact hashes below. Source changes require affected verification again.

## Reviewed fingerprints

| File | SHA-256 |
|---|---|
| `web_hudhud/lib/content-repository.ts` | `c429d1147f350c6200c24d871a29bca2363a1f151cbbac696994f4a737012a68` |
| `web_hudhud/lib/discovery.ts` | `54aa8ce83e7863f9430e026f7a071790ff113c71ecaf847fdfa502b73508076b` |
| `web_hudhud/test/content-pagination.test.mjs` | `7f684470266f4cf883b3b107e31d620fb7f27a483f9f7ee5ab03cfcd256da2b7` |
| `web_hudhud/test/discovery.test.mjs` | `520b6cad0a212eed0cf93292ba8ccf14834adf0311dc813897403ccecfc2b6f9` |
| `web_hudhud/public-home.tsx` | `ba60a3b6f68782a7a98b259b2c532450e145177159cc027851d7f7444a75396c` |
| `web_hudhud/station-detail.tsx` | `a2684a01879147a29885d8f9f1a0a53e8f91d9f2270b9065ab0e91c73c1de419` |
| `web_hudhud/test/content-pagination-ui.test.mjs` | `3a41ddcaee1bc6c166799a4ab4ed7a22718f70c3a420ba95ea2beacbe024de86` |
| `web_hudhud/test/preview.html` | `39051468e74cffa6b8042ccc86569f1a0adb3d031bb7966b7b34b1b1e84a4199` |
| `web_hudhud/test/preview.tsx` | `b11348792e600ae0592b5621604855cc8d8d542a224fe4ff1a68815185f83bdb` |


## Supplemental raw-sort-value revalidation — 2026-10-26

**REVISION_NEEDED; prior interim approval is superseded for this newly demonstrated gap.** Earlier review/test evidence is retained above. Source remains frozen at `web_hudhud/lib/content-repository.ts` SHA-256 `c429d1147f350c6200c24d871a29bca2363a1f151cbbac696994f4a737012a68`.

The C03 raw-continuation obligation also applies when the last consumed row has a malformed application sort-field value that is nevertheless a valid Firestore ordering value. `sortValue` currently supports only null, booleans, finite numbers, strings and structural timestamp-looking objects. Map/array/bytes/reference/geopoint sort values cannot round-trip through this cursor. A malformed row can therefore block an entire page and make later valid rows unreachable. In addition, a plain map containing seconds/nanoseconds is incorrectly reconstructed as an SDK Timestamp, changing Firestore value type and cursor position semantics.

Concrete reviewer probes reuse the existing actual-repository VM fixture, replacing only relative imports with resolved absolute references in `/tmp/hudhud-b12-review-raw-values.mjs`. No source was modified:

1.51 synthetic episodes, with the50th consumed row's priority set to `{unexpected:'map'}` and a valid51st episode. Assert the first page does not reject and preserves raw continuation, then the next page reaches the valid episode. Actual result: `ERR_ASSERTION`, unwanted `Unavailable content` rejection in sortValue while building the cursor. The intended page-continuation behavior fails after successful fixture/module/query execution.
2. Same placement with raw priority map `{seconds:123,nanoseconds:456}`. Request the next page and inspect actual startAfter construction. Assert the priority remains a plain map. Actual result: `ERR_ASSERTION`, constructor `Timestamp` rather than `Object`.

Command: Node22 `--experimental-vm-modules --experimental-transform-types --test --test-name-pattern='REVIEW B12:' /tmp/hudhud-b12-review-raw-values.mjs`. Result: **2 tests,0 passed,2 intended business assertion failures,0 skipped**. Probe SHA-256 `945eaac28b44530709bcd2228571e323c560d52b4a42b84d21ab68a563a0557b`; log `/tmp/hudhud-b12-review-raw-values.log` SHA-256 `707b2d39b0be85014292dabbde0d4ca9dfd9d126d7ae507f9f41c51684936414`. These are not missing-module, compile or environment failures.

Required correction: permanent behavioral regressions before any fix; preserve the last consumed raw ordering tuple without guessing native Timestamp from map keys. Support the valid SDK ordering types required for malformed-row continuation, distinguish native types from maps explicitly, preserve exact nanos and document-reference scope, and validate bounded cursor payloads. Keep schema/root/resource/parent/order binding, cache restrictions, read budgets and no-autoplay behavior. Rerun focused and owning public tests/lint/typecheck/build, with independent correction review. This is separate from B11's ordinary-query document-ID error; B12's final document-ID slot already uses a string. No finding is CLOSED, production operation authorized or source fix claimed here.


## Independent raw-value correction re-review — 2026-10-26

**APPROVED again for verified interim source handoff at the corrected fingerprints below.** The supplemental raw-map and timestamp-shape issues are verified corrected; all earlier failed evidence remains retained. R08 is not CLOSED.

The existing repository now uses explicit native SDK type tags rather than structural timestamp guessing. Recursive maps/arrays retain their original types, including timestamp-looking/reserved-tag maps and safe own __proto__ properties. Native Timestamp nanos, special numbers, Bytes, GeoPoint, VectorValue and same-database DocumentReference ordering values round-trip through immutable plain JSON cursors. Reference reconstruction checks project/database identity before query construction and never creates or reads a foreign SDK app. Existing root/resource/parent/order/ID binding and cache traversal restrictions remain. Depth/node/string/serialized-size limits reject malformed/cyclic/duplicate-key/oversized payloads; the real256KiB byte fixture proves valid substantial payloads remain traversable. Changes stay within the existing repository/tests and add no dependency or generic service.

Independently reran the entire public suite under Node22: `node --experimental-vm-modules --experimental-transform-types --test test/*.test.mjs`: **83 passed,0 failed,0 skipped**; reviewer log `/tmp/hudhud-b12-independent-correction.log`. Both permanent reviewer regression identities pass. Real installed SDK queryEqual compares17 reconstructed raw bounds with their original native bounds locally, without network. Inspected permanent2-assertion pre-fix RED and retained lint/typecheck/build evidence. No E/F/source writes or production operation by reviewer.

This approval covers supported same-database cursor reference reconstruction, not permission to retarget foreign references or access foreign databases. Final browser/device, merged-candidate integration, index/data readiness and separately authorized operational checkpoints remain pending as previously documented.

| Corrected input | SHA-256 |
|---|---|
| `web_hudhud/lib/content-repository.ts` | `25abb0980e4e0717b75f11e9ea01ba2f1acd6b6a98783d1f1a0d99a03e2ff4ac` |
| `web_hudhud/test/content-pagination.test.mjs` | `59ff2476d1c20b70bb3943e812aab514e82dde4c49b2f8fd8726d94f9f7c5407` |
| `web_hudhud/test/content-pagination-ui.test.mjs` | `13162d92aed3c2d95a221459054337af7cf12a4d2ee5478fb90cbe2d079f02ce` |
| `web_hudhud/test/preview.tsx` | `3a62c15ba1e6b484cb4709911bea4fe26175d0d094725427f4655fdee3d8fd11` |
