# Recorded episode progress implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline, as already authorized. No subagent tool is exposed. No Commit/Reset: the user's latest instruction overrides commit steps in workflow skills.

**Goal:** Show elapsed/native duration and accessible seeking for recorded episodes through the existing single player.
**Architecture:** Domain progress value, existing datasource/repository, serialized controller seek, and a separate progress StreamProvider consumed by one small controls widget. Position ticks do not update StationPlayerState or rebuild Home.
**Tech Stack:** Existing Flutter3.47.5/Dart3.13.4, Riverpod and pinned just_audio0.10.6; no dependencies.
**Spec:** NOV-10 in `docs/roadmap/november-2026-roadmap.md` and `docs/contracts/playback-contract.md`.

## Global constraints

- Keep one AudioPlayer; live/episode selection, OS controls, reconnect and background ownership stay in the existing stack.
- No direct engine access from widgets; AR/EN text in ARB, RTL/200-percent text and semantic time values.
- Native positive duration gates seeking; catalog duration alone proves no seek capability.
- No autoplay from seek. Unknown/live/failed seek remain explicit and safe. No URLs/raw errors in logs or UI.
- No persistence, speed, downloads, dependency changes, signing or deployment. Actual device/audio acceptance remains separately evidenced.

## Review focus

- A delayed seek from episodeA must never move episodeB or a live source: explicit item identity and the existing load queue/generation.
- Paused controls opened later must receive current progress immediately: replay latest on each subscriber without a gap.
- Unknown/nonseekable duration and native rejection: no enabled invalid slider, no loss of ongoing playback on a recoverable seek rejection.
- Source replacement/stop/dispose: cancel progress listeners and timer; late callbacks cannot emit new source state.
- Frequent position updates: isolate them in the progress widget, including while dragging; one seek RPC on release, never per move.

## Task1 — Domain/native progress lifecycle

Files: create `lib/features/player/domain/models/audio_playback_progress.dart`; modify existing AudioPlayerDataSource, AudioPlaybackRepository, DefaultAudioPlaybackRepository and JustAudioPlayerDataSource. Extend existing player datasource tests and repository fakes.

Interfaces: `AudioPlaybackProgress({String? itemId, Duration position=Duration.zero, Duration? duration, bool isLive=true, bool seekFailed=false})`, `bool get canSeek`, `Duration clampPosition(Duration value)`. Both interfaces expose `Stream<AudioPlaybackProgress> get progressChanges` and `Future<bool> seek(Duration position, {required String itemId})`.

- [x] RED model/native tests: live/unknown/zero duration disabled; clamp both edges; late paused subscriber gets current identity/position; source switch clears progress; stale item ID is rejected; seek rejection disables this attempt without playing; timer/listeners dispose.
- [x] Implement native positive-duration progress and identity checks. Attach playback-event subscription only for the loaded episode and generation. Use a single owned500ms local position timer only while ready/playing; cancel on pause/replacement/live/stop/dispose. Read synchronous player position; no extra network or per-load just_audio position-stream factories.
- [x] Run `flutter test --no-pub test/features/player/data` and the model test; require pass. Test session injection retains the production AudioSession.music default.

## Task2 — Serialize controller seeks

Files: StationPlayerController; its existing tests and two AudioPlaybackRepository fakes (`test/support/development_fixtures.dart`, `test/features/player/presentation/station_player_controller_test.dart`).

Interface: `Future<bool> seek(Duration position, {required String episodeId})`. Reject live/wrong selection/loading/failure; append to `_loads`, recheck captured generation/episode at execution, delegate expected `episode:<id>`. Do not call play/pause or publish position ticks in StationPlayerState.

- [x] RED tests: wrong/live identity has no RPC, pause retains position intent, delayed load/seek then new selection cannot seek the new source, seek invokes neither play nor pause.
- [x] Implement with the existing queue; preserve current toggle/retry/stop/reconnect tests.
- [x] Run controller tests and require pass.

## Task3 — Isolated accessible controls

Files: `lib/app/providers.dart` wiring; create `lib/features/player/presentation/widgets/episode_progress_controls.dart`; integrate it in NowPlayingSheet for episodes only; ARB/generated localizations; new widget test.

Interface: `audioPlaybackProgressProvider` as auto-disposed StreamProvider; `EpisodeProgressControls({required String episodeId})` with a value key per episode. Read progress matching the expected ID and the selected playback phase. Local drag draft ignores incoming ticks until release; only onChangeEnd invokes the controller once. Display elapsed/native total or localized unknown duration; keep seek failure/unavailable text distinct. Use semantic slider labels/time formatter and no live seeking.

- [x] RED widget tests: AR/EN+RTL+200-percent, unknown/live no seek control, real elapsed/duration, drag sends one command, stale item data ignored, late completion after disposal cannot update state.
- [x] Implement controls and localized copy. Episode title is the selected title; live UI remains unchanged.
- [x] Run focused widgets and player tests; require pass.

## Task4 — Integrated acceptance

- [x] Update playback contract with progress/seek ownership, state transitions and limits.
- [x] Run format check, analyzer, full Flutter tests, Android debug and iOS simulator build; review generated changes without discarding them.
- [x] Record physical-device/background/interruption/long-audio gates truthfully, without substituting mocks/builds for device evidence.
- [x] Update WORK_PROGRESS and November execution ledger. Continue remaining geography/migration and final roadmap checks; no Commit/Reset/push/deploy.

Local implementation/checks are complete. Physical-device acceptance remains open and is recorded rather than inferred from builds. Geography owner validation remains outside this player slice. No commits were created.
