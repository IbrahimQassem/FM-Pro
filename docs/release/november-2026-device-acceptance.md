# November2026 physical-device acceptance worksheet

Status: **not run**. A simulator/build/mock is not a physical-device result.
Use this sheet alongside `november-2026-local-acceptance.md` and the playback
contract. No production account, FCM send or deployment is authorized by this sheet.

## Required run context

| Field | Record before testing |
|---|---|
| Test owner and date/time | Unassigned / pending |
| Physical Android model and OS | Pending; omit serial/device/account identifiers |
| Physical iPhone model and OS | Pending; simulator does not substitute |
| Baseline artifact before the relevant player changes | Pending |
| Candidate artifact/source fingerprint | Copy exact values from the latest local acceptance record |
| Test source/network | Same approved source and network for both builds; record an alias rather than a media URL |
| Capture method | One consistent monotonic timing/video method; do not mix stopwatch and profiler values |
| Notification test environment/account | Dedicated approved test setup; real delivery remains separately authorized |

The preserved `/tmp/hudhud-november-artifacts/pre-accessibility-fix/` files are
**only the baseline before the semantics fix**. They already contain episode
progress and must not be presented as the baseline before NOV-10. Source HEAD
and buildable baseline selection must be agreed before claiming a complete
before/after player latency comparison.

## Playback and performance record — repeat per physical platform

| Scenario | Required observation | Baseline | Candidate | Result |
|---|---|---|---|---|
| Live start | Tap-to-playing phase and tap-to-first-audible audio measured separately, same source/network/method; retain individual samples | Pending | Pending | Not run |
| Primary failure / configured backup | Primary failure cannot hang indefinitely; backup either plays or exposes the existing retry state; record time and phase | Pending | Pending | Not run |
| Recorded episode | Correct title, elapsed/native total; seek once after release; paused seeking stays paused; unknown duration has no enabled slider | Pending | Pending | Not run |
| Source change during seek/load | Switch episode→episode→live while work is pending; no old seek moves the new source, no extra player | Pending | Pending | Not run |
| Screen reader and keyboard | TalkBack/VoiceOver announces one named adjustable control with elapsed/total; increase/decrease works; AR/EN and RTL directions; external keyboard where available | Pending | Pending | Not run |
| Background>30minutes | Start time/end time and elapsed duration, lock screen, foreground return; continuous audio and consistent controls | Pending | Pending | Not run |
| Controlled audio interruption | Pause/duck/resume follows the playback contract; a user pause during interruption never resumes automatically | Pending | Pending | Not run |
| Headset / Bluetooth | Route change and media buttons control the single shared source; disconnect does not create duplicate playback | Pending | Pending | Not run |
| Offline / recovery | Disconnect and reconnect; explicit failure/retry behavior, no false source-health claim from device failure | Pending | Pending | Not run |
| Stop / close / re-open | Stop clears selection; no phantom position timer/second session; process death does not autoplay | Pending | Pending | Not run |

Retain raw timing samples and the method, not only an average. Investigate any
observed regression; no invented latency threshold is supplied here. Sanitize
captures: no account identifiers, source URLs, tokens or private notifications.

## Real notification delivery record

| Scenario | Required observation | Android | iOS |
|---|---|---|---|
| Permission denied / opt-out | No unexpected prompt/send/topic membership; explicit opt-out remains effective | Not run | Not run |
| Environment isolation | Dev audience does not receive Official sends and vice versa | Not run | Not run |
| Program / episode / manual broadcast | Provider acknowledgement distinguished from actual device receipt; correct navigation | Not run | Not run |
| Foreground / background | Record actual device receipt in each supported state | Not run | Not run |
| Failed / unknown outcome | Known failure can retry by policy; uncertain send remains explicit without forcing a duplicate | Not run | Not run |

Do not force a production retry to generate evidence. Synthetic receipts already
prove server-state transitions; this sheet covers the missing device outcome.

## Exit

Attach sanitized evidence, artifact identities, each pass/fail and unresolved
issue. Keep geography owner acceptance separate. No release approval until the
required platform/device rows and the original before/after measurement have
actual evidence. A partially filled sheet is not a passed session.
