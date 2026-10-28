---
name: hudhud-playback-diagnostics
description: Diagnose HudHud FM live-radio or recorded-episode playback failures, stale async state, background interruptions, seeking, retries, or sleep timers using source traces and sanitized device evidence. Use for audio incidents and regressions, not ordinary UI styling or release approval.
---

# HudHud playback diagnostics

Locate the HudHud repository; paths below are repository-relative. Read `AGENTS.md`,
`docs/README.md`, `docs/contracts/playback-contract.md`, and `.agents/roles/playback.md`.
Keep diagnostic-only requests read-only; use the implementer workflow for authorized
fixes. Neither diagnosis nor available device tools authorizes production changes.

## Establish the reproduction

Record the candidate revision and dirty-tree state, app build/mode, Flutter/engine
and audio package versions, device OS/model (no serial), foreground/background state,
live versus recorded source, user actions and expected/observed outcome. Use source
aliases, not stream URLs. Distinguish an emulator/simulator from a physical device.
Check the actual lockfile/build before assigning an upstream version-specific cause.

## Trace the existing player

Start with the relevant layer and callers, not a new player implementation:

- `lib/features/player/presentation/controllers/station_player_controller.dart`:
  selection generation, play intent, serialized load/seek work, retries and timers.
- `lib/features/player/data/datasources/just_audio_player_data_source.dart`:
  native events/errors, primary/backup behavior, progress and resource lifecycle.
- `lib/app/providers.dart`: shared ownership and disposal; inspect the intervening
  repository interface/implementation under `lib/features/player/` as needed.
- `test/features/player/`: existing controller, datasource, widget and platform
  regressions. Search for a matching test before adding a new reproduction.

For races, reconstruct action ordering and async completions. Check whether a stale
load/seek/error belongs to a replaced selection; distinguish native idle/error from
user stop, live reconnection from episode failure, and explicit play from interruption
recovery. Verify retry cancellation/budget and sleep-deadline preservation against the
contract. A UI playing state is not proof that audio became audible.

## Gather bounded evidence

Prefer controlled fake-based reproductions for ordering and state defects. Run the
smallest relevant existing test, then the quality gates for an authorized fix. Do
not weaken production diagnostics or add logging of raw native errors, URLs, account
identifiers, tokens, or payloads. Inspect only sanitized, app-scoped device evidence;
avoid dumping device-wide logs or sharing raw crash attachments.

For physical behavior use `docs/release/november-2026-device-acceptance.md`, or its
documented successor for the candidate. Record individual results for lock/background,
interruptions, media buttons, headset/Bluetooth, offline recovery and the relevant
timer/seek flow. Use the same source/network/method for before/after latency evidence.
Do not reset device data, alter permissions or interrupt unrelated playback implicitly.
If devices or approved test sources are unavailable, keep those checks Not run.

## Report

Separate reproduced defects, source-based hypotheses, eliminated causes and unknowns.
Give trigger, precise source location, smallest repair direction, checks/results and
remaining device evidence. A controller test or debug build cannot close the physical
audio matrix. Update an existing evidence document only when the task authorizes it;
do not turn diagnosis into a release-ready claim.
