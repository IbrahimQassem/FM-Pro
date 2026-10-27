# B16 original 17 emulator identity acceptance review

Decision: **APPROVED execution of all 17 original skipped identities on this admin candidate.** The historical skip debt is discharged for this specific run/candidate: none of the 17 is skipped, renamed away or replaced by a newer case. This is not full WO03/WO01/B16/global final acceptance or finding closure. A changed later candidate still requires affected final gates.

Parent-owned Node22 `npm run emulators:admin` closes 43/43 tests, zero failures/skips/cancellations, 75091.462498ms, exit 0 and clean Auth/Firestore/Functions/Storage/Eventarc/Tasks/Hub/logging shutdown. The 43 includes additional cases and nested tests; the table maps the exact 17 original registry entries to their current declaration and distinct actual PASS line. Dynamic declarations are expanded using their actual source loops, not guessed name substrings.

| Registry | Source declaration | Exact original identity | Actual pass log line |
|---|---|---|---|
| 1 | `web_admin/test/admin-images.emulator.test.ts:21` | real admin image callable re-encodes files in Storage, isolates roots and keeps SDK writes closed | 63 (`ok 1`) |
| 2 | `web_admin/test/admin-images.emulator.test.ts:193` | real image callable rejects authenticated non-admin and forged actor data | 93 (`ok 2`) |
| 3 | `web_admin/test/admin-images.emulator.test.ts:193` | real image callable rejects foreign ownership and global media for station admins | 123 (`ok 3`) |
| 4 | `web_admin/test/batch-import.emulator.test.ts:14` | batch import against emulator: creates programs and episodes, increments counters, and handles unchanged re-imports as no-ops | 144 (`ok 4`) |
| 5 | `web_admin/test/editorial-queries.emulator.test.ts:11` | editorial aggregates respect expiry boundaries, activation and explicit null schedules in both roots | 181 (`ok 6`) |
| 6 | `web_admin/test/episode-deletion.emulator.test.ts:18` | episode deletion is retryable, root-scoped and decrements counters once | 238 (`ok 7`) |
| 7 | `web_admin/test/location-relations.emulator.test.ts:9` | trusted location saves update off-page stations, serialize identity and reject stale reference selection | 313 (`ok 8`) |
| 8 | `web_admin/test/moderation-authorization.emulator.test.ts:8` | station_admin: real callable enforces station scope and reserves account disabling for super admins | 360 (`ok 9`) |
| 9 | `web_admin/test/moderation-authorization.emulator.test.ts:8` | moderator: real callable enforces station scope and reserves account disabling for super admins | 384 (`ok 10`) |
| 10 | `web_admin/test/pl03-moderation.emulator.test.ts:20` | HudHudDev: new comment journey | 435 (`ok 11`) |
| 11 | `web_admin/test/pl03-moderation.emulator.test.ts:20` | HudHudDev: corrected counter control | 453 (`ok 12`) |
| 12 | `web_admin/test/pl03-moderation.emulator.test.ts:20` | HudHudOfficial: new comment journey | 471 (`ok 13`) |
| 13 | `web_admin/test/pl03-moderation.emulator.test.ts:20` | HudHudOfficial: corrected counter control | 489 (`ok 14`) |
| 14 | `web_admin/test/program-transfer.emulator.test.ts:9` | trusted program transfer includes off-page children, races safely with creation and rejects overflow | 557 (`ok 17`) |
| 15 | `web_admin/test/review-report.emulator.test.ts:12` | concurrent moderation resolves off-page reports and decrements once | 608 (`ok 18`) |
| 16 | `web_admin/test/save-authorization.emulator.test.ts:11` | real callable rejects unauthenticated callers and cross-station takeover, and permits own-station edits | 633 (`ok 19`) |
| 17 | `web_admin/test/save-content.emulator.test.ts:15` | actual save transaction preserves retry counters, rejects stale edits and moves atomically in both roots | 669 (`ok 20`) |

## Real worker versus diagnostic controls

The actual runner shares runCountEmulatorSuite('admin'), creates a temporary no-secrets source and exports the real functions/index.js callables plus countEpisodeComments and moderateEpisodeComment. Log lines 21–28 confirm their real definitions and Firestore trigger initialization; repeated Beginning/Finished executions confirm both handlers ran. The source binds count to onDocumentWritten and moderation to onDocumentCreated at the actual canonical comment path. The runner uses demo-hudhud-admin-test and Auth/Firestore/Functions/Storage emulators; no reviewer/provider/production operation was executed.

PL03 root×correctedCounter declarations retain four distinct identities. Entries 10/12 (new comment journey) create a Rules-valid client comment and report, then wait for the real registered worker to establish count 1 before invoking the real moderation callable and asserting hidden/resolved/count 0. They do not execute syncComment or manually write an expected counter. Entries 11/13 explicitly enter correctedCounter and call the actual authority helper as diagnostic controls; these remain separately mapped and do not substitute for new-comment journeys. Canonical episode setup uses the approved genuine birth baseline with initial count 0, not a seeded expected post-comment result. Additional passing tests verify subsequent direct status writes and deletion converge through the registered write handler in both roots; onCreated alone cannot satisfy those later transitions.

The 115 input fingerprints captured after launch all match current files. This is honestly an AFTER-LAUNCH snapshot under parent sole-writer stability, not a newly invented complete pre-launch fingerprint. It includes the tests, helper/harness, real handlers and relevant configs. The exact log, manifest, registry and per-file fingerprints are recorded in the companion provenance. The ordinary npm test skip guard remains in source by design; this explicit emulator run executes every mapped identity without skip. Historical planning/failed/skipped records remain historical and are not rewritten.

The original 17 execution obligation is now verified for this candidate. Separate final independent WO reviews/QA, changed-candidate integration, T12 native migration/seal/lease/ACK/custody and collector query/index gates, full Flutter/build, browser and physical Android/iPhone acceptance remain mandatory. All findings remain OPEN. Production migration/apply/restore, real notification send, deployment and protected merge remain separately unauthorized. Reviewer /root/b10_review only read source/logs/hash evidence and wrote /tmp reports; no emulator rerun, Flutter run or live file edit occurred.
