# B14 independent backend technical review

Date: 2026-10-26. Reviewer: independent `b09_review`; no implementation authorship or application source changes.

## Verdict

**APPROVED for the B14 verified interim handoff.** No blocking source, security or budget/progress issue was identified in the frozen five-file candidate. R11 remains OPEN. This approval does not establish private-path Rules acceptance, production readiness, deployment approval or final Work Order acceptance.

## Assessed behavior

- The existing300-second scheduler allocates100seconds per root and preserves at least40seconds invocation reserve. Pair admission requires16seconds of worst-case probing plus10seconds flush margin. The worker uses sequential probes, document-ID pages of at most50 and last-completed raw station IDs; end-of-catalog resets the cursor for a later invocation rather than looping immediately. The deterministic19-timeout and105-station tests substantiate fairness without claiming a production speedup.
- Private progress uses a120-second lease with validated owner, generation, cycle and cursor. Station health and its completed-unit cursor are written in one transaction after re-reading the checkpoint and current station. Changed primary/backup URLs, inactive/deleting records, missing stations and stale ownership are skipped or rejected without resurrection. Unit failure cannot advance to a prefetched page end. Durable cursor recovery also handles an unknown acknowledgement after an atomic commit.
- Stable station health preserves zero-write/30-minute-heartbeat behavior. Lease/cursor writes are separately counted operational writes. Existing online/degraded/offline transition and threshold-alert semantics remain intact.
- Existing public-fetch SSRF, DNS, redirect, response-size/deadline and shared four-fetch protections are unchanged and their focused regressions pass. The outer worker bounds root waiting instead of racing a second8-second timer against the existing transport deadline. Telegram delivery is bounded and aborted, errors are sanitized, and alerts remain best effort without an exactly-once claim.
- The scheduler retains its15-minute/Asia-Aden/300-second/maxInstances1 configuration, preserves B11's aggregate export and leaves unrelated senders unchanged. No dependency, configuration, Rules or public contract was altered by B14.

## Independent evidence

- Verified all **five integrated source/test hashes** and all **nine recorded evidence hashes** in `evidence/WO-04/B14-provenance.json`; zero mismatches.
- Independently executed exact Node22.23.3: `node --test functions/test/stream-health.test.js functions/test/stream-health-progress.test.js functions/test/public-fetch.test.js`: **53 passed, 0 failed, 0 skipped**. Log: `evidence/WO-04/B14-independent-focused.log`.
- Independently executed a synthetic reviewer-only lost-acknowledgement probe: the station+cursor transaction commits, the wrapper then rejects its acknowledgement, the lease expires, and the next invocation starts at the following station without incrementing the first station twice. **1 passed, 0 failed, 0 skipped**. File: `/tmp/hudhud-b14-independent-probe.mjs`; log: `evidence/WO-04/B14-independent-ack-probe.log`.
- Checked syntax for the new progress module and scoped whitespace diff: PASS.
- Inspected the retained baseline's four genuine business assertion failures and the additional duplicate-timer regression, plus the author's hash-matching full Functions285/285 and lint PASS evidence. The intermediate timer-fix source hash was not captured and is honestly disclosed; it is not presented as an immutable baseline snapshot.
- All reviewer tests use synthetic SDK doubles and injected fetch/alert callbacks. No emulator, Flutter runtime, external stream fetch, real Telegram message, production operation, migration, deployment or protected merge was performed.

## SDK deadline limitation and remaining gates

A local timeout bounds waiting; it cannot cancel an already-dispatched Firestore commit. Callback-time deadline checks prevent staging new writes after expiry, while a commit dispatched earlier may complete or be acknowledged later. The durable station/cursor transaction and read-version conflict on checkpoint ownership protect unknown-outcome recovery and lease takeover. No hard server-side wall-clock cancellation guarantee is claimed. This limitation is explicitly recorded in provenance and must remain visible in operational acceptance.

Actual client-role denial tests for the private progress path remain mandatory under04-T12/final integration. Final merged-candidate Functions/Rules gates, original17admin obligations, full Flutter/build and physical-device acceptance remain separate requirements. Later authorized rollback must pause/drain workers and respect durable progress rather than blindly deleting leases/cursors. No finding is CLOSED by this review.

## Reviewed fingerprints

| File | SHA-256 |
|---|---|
| `functions/lib/stream-health.js` | `801a0ae7ac5b451db9dfcfe8f1f60213f56990abdcc43fcd01cc95ce6e25feeb` |
| `functions/test/stream-health.test.js` | `517827fbda8ba33033983bbf1ed4937397137a71d512864a926e3304c5738b49` |
| `functions/lib/stream-health-progress.js` | `8a72080287fb202e71b70fb539f27c23028f09d099c4a28083fddd874fe3c6f2` |
| `functions/test/stream-health-progress.test.js` | `13b36dbd1d10c251bea2802a791002b0f16f422d61a614c1d4586b21445b588c` |
| `functions/index.js` | `2b98ad5bab789d687327b585eb6d1142e8a25a8ea37b8336cbfa12244a802316` |

The provenance SHA-256 at review is `3514fdfe68e04f6e9fc39d1220eb06bf30066f308f59affd7839a03a06c59775`.
