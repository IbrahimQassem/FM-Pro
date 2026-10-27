# B15 producer and maintenance source review

Status: **APPROVED for this source checkpoint only.** No blocking issue found in the frozen producer and maintenance changes. This permits the separately approved full nonempty tool implementation to begin under its registered write sets and RED/GREEN/review gates; it does not approve operating that tool, activate production, complete full B15 or close R12.

Reviewer: independent Tech Lead `/root/b10_review`, not the implementation author. Review applied the Boss Tech Lead code review workflow and current project contracts. Baseline HEAD: `c304e85963546220ccbdac51390fe0c03de02419`.

## Scope and decisions

- RSS repair reads the root count fence inside the actual lease, apply/restore item and completion transactions. Pagination repair does the same for episode resources; program-only metadata repair remains compatible. An expired paused lease never authorizes mutation. The narrow changes preserve owned SDK binding, private encrypted backup/custody checks, source CAS, native receipt identities, resume and conditional rollback controls already reviewed.
- Spreadsheet import and preview preserve the existing authority-owned comment count rather than resetting it during metadata writes. New active episode creation uses the existing immutable native birth baseline and count zero in the same transaction. All reads precede deferred writes; deletion tokens refuse writes. Import chunks reserve the possible additional baseline write within 450 operations, and preview refuses expanded atomic plans over 500 instead of splitting them.
- Development seed retains development scope, input validators, dry-run default and create-only atomicity. Private birth writes count toward the 500-write limit. Active full seed writes canonical comments with zero-count native births; the actual event worker must converge after commit. Comment-only helper plans require an accepted existing episode baseline in the same transaction and preserve its counter. The actual CLI `--engagement-only` still creates favorites/subscriptions, without a new product mode. Unit convergence invokes the real count authority and is not represented as real worker delivery.
- Status migration exhausts a first validation pass to EOF using raw document-ID pages of 25 before any apply. Its second pass revalidates pages and delegates each transaction to the existing count authority. Fresh terminal status or deletion is respected; stale validation cannot resurrect a comment or overwrite a newer terminal decision. A concurrent invalid value stops further units without claiming rollback of already committed units. Missing or malformed count readiness fails closed.
- The native API cleanup removes only unused `serverTimestamp` callback parameters and callback-presence checks. Native receipt, immutable creation identity, literal conversion, lineage, baseline, fence and safe arithmetic checks remain. No dummy timestamp, independent counter arithmetic, new dependency or architecture layer was introduced.

## Evidence

| Gate | Result and interpretation |
|---|---|
| RSS retained behavioral RED |47 executed: 39 pass, 8 intended assertion failures, 0 skips; paused apply/restore and in-flight item mutation were not refused before the fix. |
| Pagination initial RED |50 executed: 44 pass, 6 intended assertion failures, 0 skips. |
| Pagination expanded RED |52 executed: 44 pass, 8 intended assertion failures, 0 skips; adds both-root pause during inverse restore. Two later program-only positive controls produce 54 final cases. |
| Four-producer retained RED |30 executed: 10 pass, 20 intended business assertion failures, 0 skips; count preservation, missing birth, paused mutation, count-aware status and baseline readiness behavior. Setup failures from intermediate runs are excluded. |
| Independent exact Node22 rerun | **141/141 pass, 0 failures, 0 skips**, exit 0: 40 producer, 47 RSS, 54 pagination cases. Log: `evidence/WO-04/B15-producer-independent-tools.log`. |
| Parent integrated tooling |240/240 pass, 0 skips, recorded in `B15-producer-integrated-tools.log`. |
| Parent integrated Functions |328/328 pass, 0 skips, recorded in `B15-producer-integrated-functions.log`; Functions lint exits0. |

The accepted behavioral assertions were retained. The two producer test description corrections clarify comment-only helper plans without changing the real engagement-only CLI contract. Storage adapters stage atomic operations and native metadata; decisions and arithmetic use the existing production authority. Expanded guards cover more than 100 statuses, late invalid values, fresh terminal races, paused transaction entry, private-write capacity and actual validated seed plans. Ordinary model evidence does not substitute for the separate actual SDK conflict/retry and worker-convergence rehearsal.

## Frozen source and test fingerprints

| Path | SHA-256 |
|---|---|
| `tool/repair_rss_urls.mjs` | `2c538bd6d3a14b959495ca0558a9945e78f884a2c98a102b21153bf9ffffb022` |
| `tool/backfill_content_pagination.mjs` | `66b14f1c4b17ddd452cff560170360ed9b2fe420065aa2562f247f459822da03` |
| `tool/import_programs_and_episodes.mjs` | `366be6fe95c7d7e757de78d8312e58cf580e4bb0e210fc33171ddb234e8aef7d` |
| `tool/firebase_seed/seed.mjs` | `c536a9dd2f6fc344c3484f597a07294d3a5b9a125292cdf2b28e3f9129233e2c` |
| `tool/firebase_seed/migrate_comment_status.mjs` | `01042b9d17be3c483c18eb2935338a4f6db9cd5274090526f2c63714bbfd836a` |
| `tool/seed-admin-preview.mjs` | `cd088ad62eb54233040a563c9660946636f9cc29f073ee246470bb78d4880dd4` |
| `functions/lib/comment-counts.js` | `77fc7b9d0e97aabe92acf6b551c4ec021c72ae1defe7333e8983b736de49547a` |
| `functions/lib/comment-count-maintenance.js` | `1a4f6ab12f8a7bc2dadb8f2ff4966829f8d37df08a028472c20076dcfd0f2d70` |
| `tool/test/repair_rss_urls.test.mjs` | `849ed70633d3e8264ff60b94f77148465c5fa6054d9dad8eb0166c0726dac011` |
| `tool/test/content_pagination_migration.test.mjs` | `46d5ac7dc119b32707183f52018810aea0af30b4e2e33116a9aed135cf66bcf1` |
| `tool/test/comment-count-producers.test.mjs` | `493dc36175c7e0ff52e542ac74afb459366328ab18510cdc8800c1bbc70c11f2` |

All listed source/test hashes match the reviewed GREEN candidates. Exact patch, contract and evidence-log hashes are recorded in `evidence/WO-04/B15-producer-review-provenance.json`.

## Remaining checkpoints

Actual SDK producer rehearsal remains required, including native same-commit birth identity, transaction conflict/retry under pause, worker convergence and terminal races. Full nonempty reconciliation, resumable apply and conditional reverse restore must follow the accepted contract and receive their own behavioral tests, integration checks and independent review. Production apply/restore/deployment remains unauthorized. The17 original skipped emulator obligations, full Flutter tests, physical-device and browser visual acceptance remain tracked separately. Full 04-T08,04-T09, B15 and R12 remain OPEN; B16 source remains pending its B15 dependency.

This review modifies review evidence only and executes no emulator, migration, live seed, production operation or deployment.


## Actual SDK producer supplement

Parent gate `evidence/WO-04/B15-producer-editorial-integrated.log` executes **91/91 tests, zero failures or skips**, exits 0 and shuts the emulators down cleanly. Independent read-only inspection confirms that its source/test inputs retain the approved producer hashes. The added fixture uses the real importer and preview in both roots: a deliberately nonzero input count becomes zero only at native birth, real registered workers count a canonical comment, metadata refresh preserves count and immutable birth version, and later status/delete events converge. Validated full/content seed plans prove create-only refusal on repetition, native birth and real worker convergence. No expected resulting counter is manually seeded.

Secondary disposable emulator projects obtain their active roots through the genuine verified empty bootstrap. Their cases prove SDK transaction refusal under pause without partial writes, native collection-group document-name bounds, 107-row status traversal with a fresh terminal race, exact count authority replay and late paused refusal. They deliberately earn no automatic worker-delivery credit. Initial paused refusal is proven; these additive cases do not claim an adversarial mid-flight pause/conflict replay that they do not execute.

This closes the scoped producer SDK rehearsal obligation represented by those cases. It does not complete full 04-T08, full 04-T09, B15, R12 or the unfinished nonempty tool, and it does not authorize operations. Exact gate/fixture/harness hashes are appended to the existing review provenance.
