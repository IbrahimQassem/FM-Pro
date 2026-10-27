# B15 consolidated existing-wire validation matrix

Scope: count-specific validation of the already accepted persistence/replay/checkpoint schemas. This is a review matrix, not a wire amendment or new design. Frozen source `3619ab8d...` remains unchanged. No new fields, state machine, service, generic codec or public test seam is requested. Preserve native receipt conversion, phase-specific absence/null, bounded work and all valid original assertions.

## Evidence classification

**Executed remaining defect:** a genuine authenticated current private replay head with object-valued `lastEpisode` and array-valued `lastHead` is accepted and republished under a new encrypted revision. It returns in-progress with zero Firestore writes. This is malformed-state/privacy-schema acceptance, NOT forged active proof, digest bypass or no-key access. The required existing types are opaque ID-or-null and lowercase64-hex hash-or-null.

**Static omissions below:** omitted early type checks do not automatically establish a bypass. Current source/receipt/backup/native seals, final digests and equality checks may already reject malformed state downstream. Preserve those checks. Tests must distinguish early purpose/type rejection from safe downstream rejection; only a healthy executable pre-fix behavioral failure earns RED. A test already safely rejected on the baseline is a guard/control, not new RED.

The original proofImage/wrapper/canonical encoding routes now reject. Public full APIs now reject own `now` options and use actual runtime Date.now; the finite private actor nowMs shim is test-only. Existing early bootstrap/store clock interfaces remain unchanged.

## Shared existing scalar types

| Type | Existing definition |
|---|---|
| Hash | Exactly64 lowercase hex; optional means explicit null where specified |
| Opaque ID/owner | Existing countId: nonempty trimmed slash-free string, at most128; no raw user identity/content |
| Head ID | `head-` plus exactly64 lowercase hex |
| Sequence | Safe integer0..999999999999, overflow rejected before allocation; optional sequence is null |
| Slot | Integer0..2; optional slot paired with its sequence is null |
| Count | Safe nonnegative integer; preserve any stricter bound already attached to index/slot/budget |
| Native time | Exact Timestamp seconds integer[-62135596800,253402300799], nanos integer0..999999999; null means proven absence only |
| Encoded count value | Exact `{t,v}` using current canonical timestamp/value/map codec. Timestamp v has exactly2 valid integers; map pairs have exactly2 elements, unique strictly sorted string keys and recursively valid nodes; no extra typed-node keys. Semantic proof/control records allow only their existing keys/types. Shared cleanup codec is unchanged. |

## Plan and bounded checkpoints

Use the exact accepted initialPlan plus accepted checkpoint-audit fields; reject unknown keys. Fields present in initialPlan are required throughout; release-only aggregate fields stay absent until their documented phase. Do not require future release fields on inventory/staging checkpoints.

| Fields | Existing type/null/phase | Current static early-check omissions to consolidate |
|---|---|---|
| version,kind,projectId,root,planHash,backupPlanHash | Existing exact tags/scope/hash binding | Scope validators already present; retain |
| beforeRootHash | Required Hash | Type currently omitted |
| previousAcceptedManifestHash | Hash or null | Type currently omitted |
| owner,generation,phase,nextUnit,lastUnit | Existing owner,positive generation,accepted phase,Sequence next/last adjacency; null last only before first item | Existing checks mostly present; preserve sequence ceilings and phase semantics |
| foldedUnit | Sequence or null, exact prior receipt folding boundary | Type currently omitted; later digest-boundary check is separate |
| receiptDigest,inventoryDigest,verifyDigest | Hash | Existing checks present |
| proofTargetSlotCount,headChainTargetSlotCount | Count | Early types omitted |
| inventoryCount,verifyCount,resumeSourceCount | Count | Existing checks present |
| episodeProofCount,headProofCount | Count | Early types omitted |
| episodeProofDigest,headProofDigest | Hash | Early types omitted |
| inventoryCursor,stageCursor,verifyCursor,currentEpisodeId,resumeSourceCursor | Opaque ID or null | Existing checks present; missing must not silently become null |
| headCursor,resumeHeadCursor | Head ID or null | Existing checks present |
| verifyStage | null in inventory/staging; accepted episodes/heads/receipts/complete branch thereafter | Existing phase checks present |
| headVerification | null or exact `{headId,image,unit,slot,expectedHash,chainTargetCount}` | Explicit headId Head-ID check needed before slice; image exact raw head; sequence/slot/hash are jointly null at exhausted chain or valid bounded values; count safe |
| receiptVerification | null or exact `{maxUnit,cursor,count,digest,targetSlots,expectedDigest}` | maxUnit bounded Sequence; cursor/count EOF arithmetic; count/slots safe; hashes exact. Existing shape and basic checks present; retain fixed prefix |
| resumeMaxUnit,resumeVerifyUnit,resumeChainUnit,resumeChainSlot,resumeChainCount | Accepted fixed-prefix Sequence/cursor/null-pair/Count branches | Keep prior/boundary order; resumeVerifyUnit can equal prefix+1 at EOF |
| resumeExpectedHash | Hash or null, according to active ancestry position | Early nullable type omitted |
| resumeReceiptDigest,resumeExpectedReceiptDigest | Hash working digest; expected hash-or-null in ready and required Hash during recovery | Ready-phase nullable type omitted; preserve recovery requirement |
| resumePhase,resumeHeadsComplete | Existing ready/receipts/heads tag and Boolean | Existing checks present |
| resumeSource | null or exact `{episodeId,verification}` | Existing exact map; ID valid and scratch exact |
| restoreMaxApplyUnit,restoreUnit | Fixed Sequence prefix and reverse cursor or null; restore cursor cannot exceed frozen maximum | Existing checks present; never enlarge prefix with inverses |
| proofMaxUnit,proofReceiptCount,proofReceiptDigest,releaseUnit,barrierVersion | Release-only accepted sequence/count/hash/native types and arithmetic; absent before release | Validate when present and require in release/active; do not silently accept arbitrary values in earlier phases |

Nine-field verification scratch is exactly commentCursor,commentCount,commentDigest,contributionCursor,contributionCount,contributionDigest,publishedCount,commentsComplete,contributionsComplete. Cursors ID-or-null, counts safe, digests Hash, flags Boolean; no extra fields. Existing revision checks these.

## Episode inventory/completion

| Fields | Existing schema | Static omissions |
|---|---|---|
| version,episodeId,episodeCreateTime,sourceVersion,sourceCounter,dataGeneration,state,lastUnit | Exact version,ID/native identities/count/opaque generation/accepted existing state/Sequence | Existing basic checks present |
| expectedSourceHead | Head ID or null; null before owned counter head exists | Type omitted |
| previousBaselineHash | Hash or null | Type omitted |
| commentCursor,contributionCursor | ID or null | Original progress cursor types omitted |
| commentsComplete,contributionsComplete | Boolean; completion only after EOF | Original flags omitted |
| publishedCount,commentCount,contributionCount | Count | Original counts omitted |
| commentDigest,contributionDigest | Hash | Original digests omitted |
| proofUnit | Sequence or null; assigned only at immutable episode proof | Type omitted |
| verification | null before verifying; exact nine-field scratch when verifying/verified | Non-verifying null branch omitted |

A raw head is exactly existing headKeys: version,kind,planHash,targetKey,targetPath,ownedField,latestApplyUnit,latestApplySlot,currentReceiptUnit,currentReceiptSlot,currentReceiptKind,currentImageHash. Scope/path/hash and unit/slot/null-pair types must match existing wire. A target-head proof adds ONLY chainTargetCount. Current revision has the closed keys and head/native seal; retain both.

## Receipts and target slots

Numeric immutable receipt keys remain disjoint from heads. Required tags/scope/index/owner/generation,targets and hashes stay closed. Per-kind proofFields must be paired and allowed only for verify; restoration fields must follow existing restore branch, including no-target control restore versus actual inverse. Do not invent an undone index for a lease/final held control receipt.

| Fields | Existing schema | Static omissions |
|---|---|---|
| episodeId,commentId | Opaque ID or null according to unit purpose | Early nullable types omitted |
| rootHash,planImageHash | Required Hash | Early types omitted |
| episodeCheckpointHash | Hash or null | Early nullable type omitted |
| undoneApplyUnit | Optional only for existing restore inverse; Sequence strictly below receipt index when present | Do not accept it as arbitrary payload on other receipt kinds; retain legal no-target restore controls without it |
| target beforeVersion/createTime | Native or proven-null existing absence, with created/changed semantics | Existing native checks; preserve receipt metadata only for real mutation |
| previousUnit/previousSlot | Joint null or bounded earlier Sequence/Slot addressing same immutable target | Existing typed adjacency; preserve strict decreasing chains |
| physicalPredecessorUnit/physicalPredecessorSlot | Restore-only jointly null or bounded earlier Sequence/Slot | Current null-pair check incomplete; slot must also be null when sequence null |
| originalProjectionHash/restoredProjectionHash | Restore-only Hash, existing normalized materialization binding | Retain restoredHash==afterHash |

Proof image branches are exactly the accepted10-field episodeProof, raw head+chainTargetCount, or exact releaseProofKeys. Reject unknown keys, mismatched unit/proof kind, missing pair, unsupported scalar type and encoded extras before backup publication or replay consumption. Source originalBaseline and beforeRoot retain their DIFFERENT existing false wrappers; do not conflate them.

## Durable authenticated replay

| Fields | Existing schema | Status |
|---|---|---|
| binding | Exact project/root/planHash/releaseIdentity/proof/releaseUnit | Current binding equality rejects altered release binding before acceptance; canonical decoder for releaseIdentity would make its typed boundary explicit, not evidence of a known bypass |
| owner,version,kind,expiresAt,revision,predecessorHash | Exact tags/owner/finite custody time/positive revision/Hash-or-null predecessor | Existing checks present; monotonic CAS/publication identity still required |
| phase,cursor | Existing receipts/heads/complete; Sequence/EOF bounds tied to immutable release | Existing checks present |
| digest,episodeDigest,identityDigest,headDigest | Hash | Existing checks present |
| targetSlots,receiptCount,episodeCount,headCount,ancestrySlots | Count | Existing checks present |
| lastEpisode | Opaque ID or null | **Executed malformed-state republish gap** |
| lastHead | Hash or null (targetKey, not `head-` document ID) | **Executed malformed-state republish gap** |
| pendingHead | null outside heads; exact existing image/unit/slot/expectedHash/count map in heads | Existing closed map/type checks present; image remains typed proof head, sequence/slot/hash jointly null or valid decreasing-chain position |

Final proof counts/digests/slot equality, original accepted release binding and Firestore read-only behavior remain mandatory. No schema correction may weaken them or infer progress from a caller-selected ciphertext, cursor or operator assertion.

## Test-before-fix handoff

The accompanying tests-only patch adds two actual authenticated-custody type regressions plus a genuine null/string progress control. Baseline must fail for missing expected rejection, not encryption/setup/missing API. No raw key appears in output. Other static fields should receive permanent data-driven typed/phase/null guards with genuine controls before validation changes. If the baseline already rejects those mutations via native/controller/backup seals, record that as guard evidence rather than inventing a new vulnerability or RED. All original81 assertions remain required, together with final independent re-review and native SDK gates.
