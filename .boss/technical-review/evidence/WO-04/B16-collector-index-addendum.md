# B16 collector query and index addendum

Read-only analysis; no source/index changes, SDK requests, emulator/runtime launches, provider calls or production operations. This replaces the earlier readiness report's unresolved index inference with a more precise documented conclusion. Native T12 query execution is still pending.

## Recommendation

Do not add a composite index for the current collector solely because it has two inequality fields. **The documented index shape is already the default collection-scoped automatic `cleanupAt ASC, __name__ ASC` index.** This is a documentation-based inference from the query's exact fields and directions, not an observation of a deployed database's index configuration. No new `firestore.indexes.json` entry is justified by current source inspection.

Inspected source fingerprints:

- `functions/lib/program-notifications.js`: `7a272a7917dea732d6fa6b3170ed2305f9fe8fa861dc87e51d328c973a094d85`
- `firestore.indexes.json`: `e8779d4922579df9364e8c6d33c94d146f22c7fc898f2ab7795717097a2b343d`

## Exact projection

The current `collectNotificationOperations` query is:

```js
firestore.collection(`${root}/notificationOperations/operations`)
  .where(FieldPath.documentId(), '>=', 'broadcast_')
  .where(FieldPath.documentId(), '<', 'broadcast`')
  .where('cleanupAt', '<=', Timestamp.fromMillis(now))
  .orderBy('cleanupAt')
  .orderBy(FieldPath.documentId())
  .limit(20)
```

This is one concrete collection, not a collection-group query. Its order is `cleanupAt ASC` then full document name ASC; `FieldPath.documentId()` string operands resolve to IDs within that collection. The half-open ID interval selects the `broadcast_` prefix because the next ASCII character after `_` is backtick. It excludes raw hex program keys and `program_date_migration_` jobs. It returns only documents with `cleanupAt` satisfying the cutoff, at most20, and batches deletion only of those returned references.

## Why the automatic index matches

Firestore automatically creates ascending/descending indexes for ordinary non-array fields. Indexes also end in document-name ordering in the same direction as the last configured field. Therefore the existing ascending `cleanupAt` automatic index already supplies both ordered components, including the name predicate; `__name__` is not another application field needing a duplicated manual index. Current local field overrides do not exempt `cleanupAt` or collection `operations`. This does not inspect or promise the configuration of any deployed database. [Official index overview](https://firebase.google.com/docs/firestore/query-data/index-overview).

Modern Firestore permits range filters on multiple fields. The published restriction concerning an ordinary range combined with **only equality** on the document key does not describe this query, whose key predicates are ranges. The general two-application-field examples requiring composites should not be applied mechanically to a field plus the name component already in its automatic index. [Official multiple-range documentation](https://firebase.google.com/docs/firestore/query-data/multiple-range-fields).

The current StructuredQuery ordering specification explicitly gives the key-range plus ordinary-field-range case a normalized order of ordinary field first, name last. Our explicit order follows that shape and names both inequality fields. Thus the old blanket advice that the document-key inequality must always be the first order does not establish a defect here. The installed Admin SDK query-order source likewise preserves explicit orders and treats the key as the final implicit component. [Official StructuredQuery specification](https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery).

## Required T12 evidence and limits

Run the actual collector through the registered synthetic Emulator fixture after T11 is integrated. Seed25 expired broadcast records, fresh broadcast records, older raw program terminal receipts and migration/job proof records. Verify the exact20 bound, subsequent progress, cutoff equality and preservation of every non-broadcast record. This proves actual SDK query acceptance and business retention behavior on the tested candidate.

It cannot prove production index readiness: the Emulator does not maintain compound-index requirements and accepts valid queries without enforcing those requirements. Keep a later authorized deployment/readiness check of actual index settings; no such operation ran here. If a real future environment reports an index failure, inspect its exact error and automatic-index exemptions before preparing a necessary additive definition. Do not change the prefix or retention protections merely to make the query pass. [Official Emulator limitations](https://firebase.google.com/docs/emulator-suite/connect_firestore#how_the_cloud_firestore_emulator_differs_from_production).

The20-document result/deletion limit is not a20-index-entry scan or cost guarantee. The first ordered range can narrow the scan by `cleanupAt`; filtering the later name component may scan additional entries. Two-range queries can incur index-entry charges. Any read-cost claim requires separately authorized Query Explain evidence, not model counts or Emulator timing. [Official multi-range optimization guidance](https://firebase.google.com/docs/firestore/query-data/multiple-range-optimize-indexes), [official billing rules](https://firebase.google.com/docs/firestore/pricing#index_entry_reads).

Conclusion: preserve the query and record **no index change justified by current documented shape**. Retain native T12 acceptance and later production readiness as separate pending gates. All findings remain OPEN.
