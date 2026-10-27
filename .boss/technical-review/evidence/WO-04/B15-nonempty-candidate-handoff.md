# B15 full04-T09 frozen candidate handoff

Status: candidate GREEN; independent source/security review, parent integration and actual SDK acceptance pending. No finding is CLOSED.

## Integration artifacts

- `/tmp/hudhud-b15-nonempty-implementation.patch`: `2960e666981542f81d321dd59f428e4cdd59f8070661b55a3eb44bd55a056e6c`; tool, registered test and additive operations appendix only.
- `/tmp/hudhud-b15-status-projection-export.patch`: `80844b884f0c851dadafa5aa2dc1c7e8823bf01fb62122dda1bfc783eb8dd540`; only exports existing unchanged `statusContribution`.
- Both patches pass `git apply --check` against the recorded current inputs. The author applied neither. Candidate directory: `/tmp/hudhud-b15-nonempty`.
- Exact inputs/outputs, contract hashes, complete Functions snapshot hashes and 16 logs: `B15-nonempty-candidate-provenance.json`.
- Original Root23 test bodies remain byte-for-byte present, including both genuine early fence-recreation RED assertions.

## Actual evidence

The complete tool run executed all 63 cases: 63 pass, zero fail/skip, including both 103-episode inventories and the 107-comment/35-deleted-tombstone union. Its filename is `B15-nonempty-small-green.log`; the attempted negative name filter excluded no cases, and no large-case omission is claimed. Combined candidate Functions pass 328/328 with zero skips; lint and explicit tool/test/core syntax checks exit 0.

Preserved candidate failures are classified in provenance. A native release rebinding guard initially failed and was fixed with the deterministic plan-scoped encrypted release pin. A caller-manifest test incorrectly reused its intentionally mutated manifest on later invocations; the test setup was corrected without relaxing scope validation. The first Functions snapshot omitted the existing synthetic JSON fixture and had two ENOENT setup failures; copying that fixture yielded the exact 328/328 rerun. None is claimed as historical R12 RED. New full APIs were tested as acceptance guards, never as missing-export RED.

## Exact APIs

Existing `createCommentCountDemoFirestore`, `CommentCountBackupStore.open`, `previewCommentCountReconciliation` and `bootstrapEmptyCommentCountRoot` remain. New exports:

```js
applyCommentCountReconciliation({ firestore, projectId, root, manifest,
  expectedManifestHash, backupStore, owner, maxItems: 25, now: Date.now })
restoreCommentCountReconciliation({ firestore, projectId, root, manifest,
  expectedManifestHash, backupStore, owner, maxItems: 25, now: Date.now })
```

`maxItems` is 1..25; `now` is optional. Preserve explicit stable `owner`, reviewed manifest and backup custody across calls. Results: `{ status, phase, processed, cursor: { nextUnit, episodeId }, readEquivalents, transactionAttempts }`. Status is `in-progress`, `active` or `restored-held`. Output cursor is informational, never an input authority. After initial native release/readback/pinning, a later accepted replay must exhaust immutable historical proof before returning active. It performs no Firestore writes and accepts legitimate later worker changes without calling them a fresh recount.

The backup store has no cleanup/close method: retain its private 32-byte key and 0700 directory for the entire recovery window. Expiry/custody failures do not delete evidence. Unknown/abandoned replay locks are not automatically stolen. Restore never rewrites canonical content/status or resurrects parents; it remains paused at `restored-held`.

## QA-only actors and remaining native acceptance

Both actors are in the same registered test file, with normal unit registration disabled in child mode. `--count-sdk-maintenance-child` accepts kind `count-sdk-maintenance`, operation `apply|restore`; `--count-sdk-replay-child` accepts kind `count-sdk-replay` and requires a real active full result. Each makes exactly one accepted API call through the actual owned demo factory/store. There are no production fault flags, eval or public arbitrary DB injection.

Private IPC request fields: `{ version: 1, kind, operation?, projectId, root, emulatorHost, directory, expiresAt, keyBytes, manifest, expectedManifestHash, owner, maxItems, nowMs? }`. `keyBytes` is a 32-element byte array passed only in private IPC, zeroed after use. No key in argv/environment/logs. Optional finite `nowMs` is only the actor clock seam. Scope and authenticated custody are validated before SDK construction. Response: `{ version: 1, kind: 'count-sdk-result', preflightReadCount: 0|2, result }` or sanitized `error`. Replay preflight reads two private documents; maintenance has zero preflight reads outside the API. Pure shape/security guards are not actual SDK proof.

Parent/QA must run the approved N01–N14 real SDK design after independent source review and integration, including maxItems 1/lease recovery, complete large inventories/unions, actual native no-op/ABA/metadata conversion and restore chains, unknown/lost commit acknowledgements, competing fresh-process local replay publication, custody/expiry/lock failure and legal mid-flight pause ordering. No emulator/native SDK session was launched by this author. Required existing account/editorial/admin/privacy/Rules/function-worker gates remain distinct.

The 1536 bound concerns application-issued document/query read equivalents and visible transaction callback attempts (maximum three), not internal gRPC retries, provider billing/index charges or wall-clock latency. Production apply/restore/activation and direct CLI mutation are refused. No production operation, deployment, merge or real message ran. The 17 original skipped test identities, full Flutter tests, physical-device acceptance and independent approvals remain explicit obligations.
