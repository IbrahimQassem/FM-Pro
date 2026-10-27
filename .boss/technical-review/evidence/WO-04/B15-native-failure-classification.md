# B15 failed native gate classification

Status: **FAILED mandatory native gate; downstream acceptance remains stopped.** Actual gate: 124 tests, 122 pass, two fail, zero skips/cancellations, exit 1, clean shutdown; 1325133.377428 ms. Log SHA-256 `058358b2a024c8bdbcdc7e6c44c4984daa878a82228c9a82131d8f825e0e75e3`. All 50 captured input hashes remain unchanged. Their capture occurred during the active gate; accepted handoff metadata separately records the before-run source/fixture hashes.

Independent reviewer `/root/b10_review` performed read-only classification. Source remains `2c7e00ba992b6a1d511cf09174d9cb626958c13de50d75dc8c4d15ba9d3efe1e`; fixture remains `547c0d46984ebc4918dd9bdc608546e94879b921a0528403c514ac005dddc609`. No source, fixture, actor, contract or runtime change, emulator/Flutter run or production operation was performed.

## Case 61: invalid publication-ACK injection, not product RED

The fixture expects the API to reject after a synthetic error thrown following an actual private-head rename. Its hook compares rename destination with `initial.path`, built from the raw mkdtemp directory. The store canonicalizes its directory using realpath. A read-only check confirms this environment's `/var/folders/...` temporary path resolves to `/private/var/folders/...`; the two exact destination strings differ. The intended hook therefore misses the actual canonical publication. The subsequent injected=true assertion is not reached because assert.rejects fails first.

Current source directly awaits rename and rethrows non-EEXIST errors. It has no `_publishReplay` safe-success fallback in this frozen implementation. Successful un-faulted publication does not establish that a genuine lost acknowledgement was accepted incorrectly. No recovery-policy relaxation or source fix is justified by this failure. The readiness review missed the alias mismatch; this classification corrects that oversight.

The fixture correction must match the canonical exact intended private head path and prove the actual post-rename injection occurred. Preserve authenticated readback, revision/proof checks, safe retry and zero Firestore write assertions. Unknown local publication acknowledgement remains governed by the existing conservative contract. Do not relabel missing injection as business RED or invent a safe-success observation.

## Case 67: genuine returned-metrics source defect

The independent SDK observer correctly measures 13 application-issued read equivalents, while active replay returns 11. This is not an AsyncLocalStorage delegation double count and not the QA actor's separate two-read preflight: the failing call is an in-process tool invocation at fixture851.

The source trace is exact: bindBirth plan/initial receipt 2 + old namespace query 1 + active admission root/plan/last receipt 3 + initial readActive 2 + one replay receipt 1 + callback final readActive 2 = 11 when fullResult snapshots output inside the replaySession callback. After private publication, replayFull performs another readActive of root and plan, charging two more reads and validating the final release binding, then returns the stale copied result. Actual budget and observed total are 13.

This is valid executed source reporting RED at the intended business assertion. The runtime meter still charges/enforces those final reads; there is no demonstrated 1536-cap violation, hidden transport/billing claim, unsafe proof acceptance or Firestore data mutation. transactionAttempts is unaffected by those two nontransaction reads.

Preserve the exact observer equality, final postpublication binding read and all caps. Author a permanent regression before changing the returned metrics snapshot, then return counters reflecting all completed charged reads. Run applicable GREEN and independent review before the next native gate; do not add a two-read tolerance, subtract measurements or remove the final safety check.

## Evidence and next checkpoint

Case 66's actual SDK retry-cap case, terminal three-attempt case 68 and partial cases remain distinct passed observations; none turns the overall failed gate GREEN. The ordinary setup/primary-positive patches remain prepared and unintegrated. Source reporting correction and fixture canonical-path correction require their own retained evidence and updated frozen hashes. Root source security boundaries remain same-hash reviewed evidence, but overall source/native acceptance is withheld for this new defect. Full 04-T09/B15, B16 and all findings remain OPEN; no production operation is authorized. Exact classification/source/log/input fingerprints are in `B15-native-failure-classification-provenance.json`.


## Permanent reporting RED and canonical fixture readiness supplement

The tests-only reporting patch `5336e764de85536efd9123950161013d226ef73e18341d3c2519aea77f593217` is structurally accepted. It preserves all original 150 assertion bodies and adds four both-root in-progress/completed replay equality cases plus two ordinary initial-apply controls. Its observer wraps actual existing model document/query/transaction methods, avoids query delegation double counting and positively checks the final observed pair is the postpublication root/plan read. It adds no source seam or count arithmetic.

Parent exact baseline executes six cases: four intended numeric ERR_ASSERTION failures (returned 11 versus observed 13, returned 31 versus observed 33 across both roots), two ordinary apply controls pass, zero skips/cancellations. Durable log `B15-replay-reporting-parent-red.log` has SHA-256 `e93b77029882c8e6ffac959dac1cb71ecfd040cff27cd8c2f00db8de952fe45b`. This is valid source reporting RED; no cap breach, proof/status defect or Firestore mutation is claimed. Root and immutable original final2 source remain 2c7e. After parent accepted this baseline, its authorized isolated working copy advanced to a6a10122; the original handoff records prior state rather than a current source freeze. This readiness review does not inspect, execute or approve that evolving correction.

The exact N13 canonical-only fixture patch `7d5604d6723bfca032ecfff454bb34b77eb14abeb62cad9f73b70a7b7edaeb38` is READY. It resolves the existing real head path before installing the hook and compares the real rename destination to that canonical path. The actual rename still happens before the synthetic error. Every existing rejection, injected flag, authenticated revision, cold resume and read-only assertion is retained. No product acknowledgement behavior changes and no extra scenario is introduced. Its Node22 syntax/apply checks pass; it has not executed natively.

Combined ordinary fixture patch `48d326a0ff86772a5ae305c38fcc8adf26cda154dce31a2313018d16d8e227e4` additionally includes only the previously approved genuine bulk55 birth setup and one serialized both-primary-root callback journey. Exact outputs are audit `6d1ef73fd3c76f7364aadf39b5b0cec85ddb4d5426a5e167d135a785fab9b3c4` and counts `dd2e8ae2aeb6140124421b4e97fcf4404986764982e5b086baf64a4a5d7f5a46`. All prior fixture assertion lines are retained. Readiness metadata `524b3a1b1641a7824c76c4d6329fe267adf1bc0a884e54f86f9d1ff8216ea33a` matches. The future 125-case native gate is unrun.

Parent may proceed through its authorized minimal metric correction and exact final freeze, independent source review, applicable GREEN and then the new native gate. Current source/native acceptance remains withheld. This supplemental review changes only review evidence; no root/source/fixture/actor/contract/E/F operation occurred.
