# B09 independent Flutter technical review

Date: 2026-10-26. Reviewer: independent `b09_review`; no implementation authorship or application source changes.

## Verdict

**REVISION_NEEDED.** The candidate passes its existing focused suite, but two independently reproduced pagination contract failures block the interim handoff. R04 remains OPEN. The review does not establish deployed indexes, Firestore Rules acceptance, builds or physical-device acceptance.

## Blocking findings

1. **P2 — malformed ordering data aborts a whole page instead of preserving raw continuation.** In `lib/features/station_content/data/repositories/firebase_station_content_repository.dart:119`, the cursor is built from raw ordering values and then passed to the canonical-type-only validator at line139. Fifty-one published episode documents with otherwise valid data and malformed `priority: 0.5` cause the page read to throw `ArgumentError` while constructing the raw continuation. The existing mapper accepts numeric values via `toInt`; it does not itself reject this sort-schema mismatch. The permanent regression should therefore assert page-boundary rejection of malformed sort-schema rows plus preserved raw continuation, without silently changing shared mapper behavior. A malformed timestamp also reaches an unchecked Timestamp cast at line127. WO-03 and C03 require invalid documents to be rejected individually and the cursor to advance from the last consumed raw document. The production ordering audit remains necessary; it does not replace this runtime page contract. Preserve a safe value-only raw sort representation and exact timestamp precision without fabricating corrected values or exposing Firebase snapshots. Add permanent malformed-ordering boundary tests before correction, then verify continuation beyond the invalid page and strict scope/version validation.

2. **P2 — a pending refresh still permits paging from the previous generation's cursor.** `StationContentController.refresh` at `lib/features/station_content/presentation/controllers/station_content_controller.dart:78` increments generations and clears loading flags but retains both old cursors. `loadMorePrograms` at line121 does not reject a pending refresh; it captures the new generation while sending the old cursor. A user can pull to refresh and press the still-enabled Load more control, causing an obsolete continuation to run. Its completion has the same generation as the refresh and can append stale rows or replace the refreshed continuation. The episode path has the same retained-cursor/no-refresh guard pattern. The independent program probe confirms one page request starts while the refresh is pending, where zero is required. Invalidate old cursors at refresh start or otherwise prevent old-cursor execution, preserving explicit retry and cache behavior. Cover both program and episode directions, including stale completion after refreshed content wins.

## Independent verification

- Verified all **25 recorded candidate input hashes** in `evidence/WO-03/B09-provenance.json` before and after review; no mismatches.
- Executed `flutter test --no-pub test/features/station_content test/features/notifications test/features/station_details`: **67 passed, zero failures**. Log: `evidence/WO-03/B09-independent-tests.log`.
- Reviewer synthetic malformed-ordering probe: **one executed failure** after successful import/compilation, from actual data-source/repository cursor validation. File: `/tmp/hudhud-b09-independent-probe_test.dart`; log: `evidence/WO-03/B09-independent-probe.log`.
- Reviewer refresh probe: **one intended assertion failure**, expected zero continuation calls while refresh pending, actual one. File: `/tmp/hudhud-b09-refresh-probe_test.dart`; log: `evidence/WO-03/B09-independent-refresh-probe.log`.
- Probes use synthetic data and existing production boundaries. No missing module, skipped test, compilation or environment failure is credited as RED.
- The author/coordinator's full375-test, analysis and format results remain retained evidence; they do not cover these independent gaps. Permanent regressions and fresh affected gates are required after corrections.

## Other assessed behavior

Visibility/parent equality filters precede query limits. Canonical ordering has a document-ID tie break, requests use51raw/50consumed records, timestamp cursors preserve nanoseconds for canonical values, and cache-derived server continuation is rejected. Domain cursor/page values do not expose snapshots. Bounded100-row windows, canonical episode-count labels, explicit page controls, localized labels, cache-first loading and disposal checks preserve the existing Riverpod layering. Direct episode resolution validates episode/program/station in at most3direct reads; alert navigation no longer scans the catalog, and the direct-target controller defers archive IO until explicit user action. No autoplay or new dependency is introduced.

## Remaining gates

Return the two blockers to the declared FL author and I integration owner. Independent re-review must inspect the corrected candidate and permanent regression evidence. Full merged-candidate integration, Firestore query/index/permission checks, all original17admin obligations, APK/iOS builds and physical Android/iPhone acceptance remain mandatory. No task or finding is CLOSED by this review. The reviewer has released the exclusive F runtime; no emulator, production operation, deployment or protected merge was performed.


## Independent re-review of the corrected candidate

Date: 2026-10-26. **APPROVED for the B09 verified interim handoff.** Both review blockers above have permanent pre-fix regression evidence and verified corrections. The original report remains retained as historical evidence. This approval does not close R04 or waive final integration, build, Rules or physical-device acceptance.

### Correction assessment

- **Raw continuation:** the existing content-specific domain model holds immutable typed raw sort values; Firebase-specific conversion stays in the existing data source. The bridge preserves scalar/null values, exact timestamp seconds/nanoseconds, byte sequences, document-reference identity, geographic points, arrays, vectors and maps. The repository now rejects malformed canonical sort fields at its page boundary without changing shared numeric mappers, then advances from the raw50th consumed document. It neither substitutes a corrected business value nor uses the lookahead. Scope, version, filter/order identity, cache/server provenance, tuple length, last document ID and typed metadata remain validated. No new dependency or general codec service was introduced.
- **Refresh generation:** station refresh clears both old cursors immediately. Both continuation methods reject initial loading and pending refresh, while already in-flight old requests remain generation-guarded. Failed refresh retains visible records, keeps obsolete cursors cleared and supports explicit refresh retry. Program-scoped refresh retains its existing episode-generation guard and clears its episode cursor through selection.
- The seven revision paths are confined to declared FL source/test ownership. Parent-owned composition/UI/localization paths and shared mappers remain unchanged from the original reviewed candidate.

### Independent evidence

- Verified all **25 current input hashes** and all **seven recorded evidence hashes** against `evidence/WO-03/B09-review-revision-provenance.json`; zero mismatches.
- Inspected retained permanent pre-fix results:17 malformed raw-ordering business failures and two pending-refresh assertion failures. The later reference-value case is correctly labeled additional GREEN coverage rather than pre-fix RED.
- Independently reran the complete focused content, notification and station-detail suites: **89 passed, zero failures**. Log: `evidence/WO-03/B09-independent-revision-tests.log`.
- Independently reran both original reviewer probes: **2 passed, zero failures**. The refresh probe's cursor construction was adapted only to the revised domain value API; its original zero-old-cursor-IO expectation is unchanged. Log: `evidence/WO-03/B09-independent-revision-probes.log`.
- Inspected hash-matching author/coordinator evidence: full Flutter **397 passed**, analysis **No issues found**, and formatting **213 files, zero changes**. These are retained global verification results, not an independently repeated full run.
- No application source was changed by this reviewer. The exclusive F runtime is released; no emulator, deployment, migration or production operation was performed.

### Revised source fingerprints

| Path | SHA-256 |
|---|---|
| `lib/features/station_content/domain/models/content_page.dart` | `7a41ec6470511c00fef2c585ccf35e31f2fece1a1a4fcda5a9a428384ac7b3d0` |
| `lib/features/station_content/data/datasources/station_content_firestore_data_source.dart` | `5ced47ba9ca0479c7ca2760668100f9da108d04bcc185c7418e8b3c93b4314b1` |
| `lib/features/station_content/data/repositories/firebase_station_content_repository.dart` | `28bc1a7c9d42bcddb859f685ed3fabfae917304949b8c069a0bc8c6317ba8f68` |
| `lib/features/station_content/presentation/controllers/station_content_controller.dart` | `f334abf1351a35fbb86181d0725741b0143071dc8728e03fe919d6223faa4e0f` |
| `test/features/station_content/data/content_pagination_test.dart` | `e2391834c953df97490f70a8419752cb10ec6dedcb381714c7df758811a4275c` |
| `test/features/station_content/domain/content_page_test.dart` | `b66755db7af6fcff26fb17189da723e7860e29347d90aef5e7ef86fd3428d270` |
| `test/features/station_content/presentation/station_content_controller_test.dart` | `5a4e9378396557acaf9dee7fbdcdb0eafb39365e91e3277b6cb515f4a54c4762` |

Final merged-candidate Firestore query/index/permission verification, the original17admin obligations, APK/iOS builds and physical Android/iPhone acceptance remain mandatory. Production legacy audit, unresolved sort-schema repair decisions and deployed index readiness remain separate rollout prerequisites.
