# B16 T11 receipt-seal technical contract acceptance

Current status: **APPROVED exact technical contract amendment** `cc824f1f6e3f446c0ef4c027c13c7061abc0f7a7f24b6a3f5cbe3f5f4e119541`. This review is authoritative acceptance of that amendment. The integrated appendices retain their historical “proposed independent review” headings unchanged; those labels describe the reviewed proposal's origin and do not override this accepted decision. No wording or semantic alteration was applied during integration.

Independent reviewer `/root/b10_review` verified the three integrated document hashes against the exact approved after-images:

| Document | SHA-256 |
|---|---|
| `docs/contracts/firebase-data-contract.md` | `c2613a34c6159715e66f98f0a543388ff151e62893e219d934140825d5f27692` |
| `docs/decisions/0006-background-consistency-and-schedule-timezones.md` | `972551c5567d4903f91b7424c578a1332dfc30d2f4d1062b2780811cce194803` |
| `docs/operations/background-consistency-migrations.md` | `4d7d87033e26f088a83d0622042388afec884fdb003a79d65d2dc8c477af73e3` |

All prior document content is an unchanged byte prefix. The patch appends only at each original EOF; existing B15 count appendices and prior runtime/native/custody/production safeguards remain intact. Original before-images and accepted after-images are recorded in the proposal provenance. Independent apply check passed before integration; current readback matches every approved after-image.

The parent accepted one permanent current-API behavioral RED before authorizing correction: a genuine no-op receipt deleted/recreated with identical data and a new native identity was incorrectly accepted. That assertion executes and fails with MissingExpectedRejection / ERR_ASSERTION, zero skips; it is neither absent API/environment failure nor proof of target/count loss. Author baseline47 comprises46 passing model guards and this one failure; the parent independently accepted the targeted one-test business failure. No runtime SDK result is inferred from those model tests.

The amendment adds only receiptVersions (max25 exact native Timestamp prefix) and pendingReceiptIndex (null or the one nextIndex-1 pending slot) to the existing private job. Native receipt create/update must match the untouched same-occurrence job updateTime before the identity is sealed. No next item, independent lease rewrite, completed result or held rollback may overwrite that anchor first. Final-item applying+pending is legal until seal; completed and rollback-held require pending null. Cold expired-lease recovery may transfer ownership only atomically with successful source/target/body/backup/prefix verification and sealing, generation+1 without overflow. Unknown item/seal acknowledgements cannot double append or reapply an uncertain mutation. Later prefix checks retain literal original native receipt identities; no transform, clock or replacement receipt can invent them.

This bounded technical correction adds no collection, service, dependency, product policy or task/graph change. Existing job creation chronology/CAS, read-before-write, custody/expiry, serialized bounds and maxAttempts3 remain. Rollback remains conditional and non-erasing, retains suppression and both namespaces, and does not restart old workers. Actual old/new worker/collector production isolation is still unsupported; no caller flag or public clock grants it.

Source correction is authorized separately by the parent following the accepted RED. It is not accepted by this contract review. Require a frozen corrected source, unchanged regression, complete model/native identity/lease/final-item/pending/unknown-ACK/rollback controls, applicable GREEN/tool/Functions/lint checks and independent source review before integration acceptance. T12 owned demo SDK/native no-op/recreation/custody/ACK and both-root permission/query/index acceptance remain mandatory. Initial setup/guard GREEN is not additional RED evidence.

All R01–R13 remain OPEN. Original17 identity registry, final exact-candidate integration, full Flutter/build, browser and physical-device gates remain separate obligations. No live data migration, production apply/restore, real notification, deployment or protected merge is approved. This follow-up reads live documents and writes only this `/tmp` report; no source, contract, emulator, Flutter or runtime operation was performed.
