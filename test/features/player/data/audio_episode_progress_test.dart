import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:just_audio/just_audio.dart';
import 'package:hudhud_fm/features/home/domain/models/station.dart';
import 'package:hudhud_fm/features/station_content/domain/models/episode.dart';
import 'package:hudhud_fm/features/player/data/repositories/default_audio_playback_repository.dart';
import 'package:hudhud_fm/features/player/presentation/controllers/station_player_controller.dart';
import 'package:hudhud_fm/features/player/presentation/controllers/station_player_state.dart';
import 'package:hudhud_fm/features/player/domain/models/audio_playback_progress.dart';
import 'package:hudhud_fm/features/player/data/datasources/just_audio_player_data_source.dart';
import 'package:hudhud_fm/features/player/domain/models/audio_playback_item.dart';

const episode = AudioPlaybackItem(
    id: 'episode:e',
    title: 'Synthetic episode',
    streamUrls: ['https://radio.example/episode.mp3'],
    isLive: false);
const live = AudioPlaybackItem(
    id: 'live:s',
    title: 'Synthetic live',
    streamUrls: ['https://radio.example/live']);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  JustAudioPlayerDataSource source(_ProgressPlayer player) =>
      JustAudioPlayerDataSource(player: player, configureSession: () async {});

  test(
      'native duration and paused position replay immediately to a late listener',
      () async {
    final player = _ProgressPlayer();
    final data = source(player);
    await data.load(episode);
    player.update(const Duration(seconds: 12));
    await pumpEventQueue();
    final progress = await data.progressChanges.first;
    expect(progress.itemId, episode.id);
    expect(progress.position, const Duration(seconds: 12));
    expect(progress.duration, const Duration(seconds: 60));
    expect(progress.canSeek, true);
    await data.dispose();
    await player.close();
  });
  test('unknown duration and live sources never call the native seek API',
      () async {
    final player = _ProgressPlayer()..nativeDuration = null;
    final data = source(player);
    await data.load(episode);
    expect((await data.progressChanges.first).canSeek, false);
    expect(await data.seek(const Duration(seconds: 10), itemId: episode.id),
        false);
    player.nativeDuration = const Duration(seconds: 60);
    await data.load(live);
    expect((await data.progressChanges.first).canSeek, false);
    expect(
        await data.seek(const Duration(seconds: 10), itemId: live.id), false);
    expect(player.seeks, isEmpty);
    await data.dispose();
    await player.close();
  });
  test(
      'seeking clamps to native duration, preserves pause and rejects a stale source identity',
      () async {
    final player = _ProgressPlayer();
    final data = source(player);
    await data.load(episode);
    expect(await data.seek(const Duration(seconds: 999), itemId: episode.id),
        true);
    expect(player.seeks, [const Duration(seconds: 60)]);
    expect(
        await data.seek(const Duration(seconds: -1), itemId: episode.id), true);
    expect(player.seeks.last, Duration.zero);
    expect(player.playCalls, 0);
    await data.load(live);
    expect(await data.seek(const Duration(seconds: 12), itemId: episode.id),
        false);
    expect(player.seeks.length, 2);
    await data.dispose();
    await player.close();
  });
  test(
      'a rejected native seek disables scrubbing without turning ongoing audio into a new play request',
      () async {
    final player = _ProgressPlayer();
    final data = source(player);
    await data.load(episode);
    player.update(const Duration(seconds: 12));
    await pumpEventQueue();
    player.rejectSeek = true;
    expect(await data.seek(const Duration(seconds: 20), itemId: episode.id),
        false);
    final progress = await data.progressChanges.first;
    expect(progress.seekFailed, true);
    expect(progress.canSeek, false);
    expect(progress.position, const Duration(seconds: 12));
    expect(player.playCalls, 0);
    player.rejectSeek = false;
    await data.load(episode);
    expect((await data.progressChanges.first).seekFailed, false);
    await data.dispose();
    await player.close();
  });
  test(
      'a delayed seek cannot emit old progress after switching to live or disposal',
      () async {
    final player = _ProgressPlayer();
    final data = source(player);
    await data.load(episode);
    player.seekBarrier = Completer<void>();
    final seeking = data.seek(const Duration(seconds: 20), itemId: episode.id);
    await pumpEventQueue();
    await data.load(live);
    player.seekBarrier!.complete();
    expect(await seeking, false);
    expect((await data.progressChanges.first).itemId, live.id);
    await data.stop();
    expect((await data.progressChanges.first).itemId, isNull);
    await data.dispose();
    expect(player.events.hasListener, false);
    expect(player.states.hasListener, false);
    expect(player.errors.hasListener, false);
    await player.close();
  });
  for (final mode in [
    'rewind',
    'manual seek',
    'unknown duration',
    'reentrant resume'
  ]) {
    test('replay real controller repository and native source: $mode',
        () async {
      final manualSeek = mode == 'manual seek';
      final unknownDuration = mode == 'unknown duration';
      final reentrantResume = mode == 'reentrant resume';
      final player = _ProgressPlayer();
      if (unknownDuration) player.nativeDuration = null;
      final data = source(player);
      final controller =
          StationPlayerController(DefaultAudioPlaybackRepository(data));
      const station = Station(
          id: 's',
          name: 'Synthetic station',
          streamUrl: 'https://radio.example/live',
          countryCode: 'YE',
          countryNameAr: 'Synthetic country',
          cityCode: 'synthetic',
          cityNameAr: 'Synthetic city',
          priority: 0,
          isLive: true,
          isActive: true,
          isVerified: false,
          isFeatured: false,
          programsCount: 1,
          subscribersCount: 0,
          totalPlays: 0);
      final recording = Episode(
          id: 'e',
          programId: 'p',
          stationId: 's',
          title: 'Synthetic episode',
          audioUrl: 'https://radio.example/episode.mp3',
          durationSeconds: 60,
          priority: 0,
          isPublished: true,
          isFeatured: false,
          broadcastAt: DateTime.utc(2026, 10, 26),
          utcOffsetMinutes: 180,
          playsCount: 0,
          likesCount: 0,
          commentsCount: 0);
      try {
        await controller.playEpisode(recording, station);
        await pumpEventQueue();
        player.position = const Duration(seconds: 60);
        player.event = PlaybackEvent(
            processingState: ProcessingState.completed,
            duration: player.nativeDuration,
            updatePosition: player.position);
        player.states.add(player.playerState);
        player.events.add(player.event);
        await pumpEventQueue();
        expect(player.playing, true,
            reason: 'Native completed may retain its play flag.');
        expect(controller.state.status, StationPlaybackStatus.paused);
        if (manualSeek) {
          expect(
              await controller.seek(const Duration(seconds: 20),
                  episodeId: recording.id),
              true);
          await pumpEventQueue();
          expect(player.playing, false);
          expect(player.playCalls, 1);
        }
        if (reentrantResume) {
          player.seekBarrier = Completer<void>();
          final firstResume = controller.resume();
          await pumpEventQueue();
          expect(player.seeks, [Duration.zero]);
          expect(player.playing, false);
          expect(controller.state.status, StationPlaybackStatus.paused,
              reason: 'Native pause emits completed while rewind is pending.');
          final secondResume = controller.resume();
          await pumpEventQueue();
          player.seekBarrier!.complete();
          await Future.wait([firstResume, secondResume]);
        } else {
          await controller.toggleCurrent();
        }
        await pumpEventQueue();
        expect(
            player.seeks,
            unknownDuration
                ? <Duration>[]
                : [manualSeek ? const Duration(seconds: 20) : Duration.zero]);
        expect(player.loadCalls, unknownDuration ? 2 : 1);
        expect(player.position,
            manualSeek ? const Duration(seconds: 20) : Duration.zero);
        expect(player.playCalls, 2);
        expect(controller.state.status, StationPlaybackStatus.playing);
      } finally {
        controller.dispose();
        await data.dispose();
        await player.close();
      }
    });
  }

  test('replay native completed seek rewinds without implicitly resuming audio',
      () async {
    final player = _ProgressPlayer();
    final data = source(player);
    await data.load(episode);
    player.playing = true;
    player.position = const Duration(seconds: 60);
    player.event = PlaybackEvent(
        processingState: ProcessingState.completed,
        duration: player.nativeDuration,
        updatePosition: player.position);
    player.states.add(player.playerState);
    player.events.add(player.event);
    await pumpEventQueue();
    try {
      expect(await data.seek(Duration.zero, itemId: episode.id), true);
      expect(player.position, Duration.zero);
      expect(player.playing, false,
          reason: 'Seeking a completed episode is not a play request.');
      expect(player.playCalls, 0);
    } finally {
      await data.dispose();
      await player.close();
    }
  });
  test(
      'one position clock runs only for a playing episode and cancels on pause or stop',
      () async {
    final player = _ProgressPlayer();
    final data = source(player);
    await data.load(episode);
    final values = <AudioPlaybackProgress>[];
    final subscription = data.progressChanges.listen(values.add);
    await data.play();
    await pumpEventQueue();
    player.position = const Duration(seconds: 5);
    await Future<void>.delayed(const Duration(milliseconds: 600));
    expect(values.last.position, const Duration(seconds: 5));
    await data.pause();
    await pumpEventQueue();
    player.position = const Duration(seconds: 10);
    await Future<void>.delayed(const Duration(milliseconds: 600));
    expect(values.last.position, const Duration(seconds: 5));
    await data.play();
    await pumpEventQueue();
    await subscription.cancel();
    final reads = player.positionReads;
    await Future<void>.delayed(const Duration(milliseconds: 600));
    expect(player.positionReads, reads);
    await data.stop();
    await data.dispose();
    await player.close();
  });
}

class _ProgressPlayer implements AudioPlayer {
  final states = StreamController<PlayerState>.broadcast();
  final events = StreamController<PlaybackEvent>.broadcast();
  final errors = StreamController<PlayerException>.broadcast();
  Duration? nativeDuration = const Duration(seconds: 60);
  @override
  Duration get position {
    positionReads++;
    return _position;
  }

  set position(Duration value) => _position = value;
  Duration _position = Duration.zero;
  int positionReads = 0;
  @override
  bool playing = false;
  bool rejectSeek = false;
  Completer<void>? seekBarrier;
  int playCalls = 0;
  int loadCalls = 0;
  final seeks = <Duration>[];
  PlaybackEvent event = PlaybackEvent(processingState: ProcessingState.idle);
  @override
  PlaybackEvent get playbackEvent => event;
  @override
  PlayerState get playerState => PlayerState(playing, event.processingState);
  @override
  Stream<PlayerState> get playerStateStream => states.stream;
  @override
  Stream<PlaybackEvent> get playbackEventStream => events.stream;
  @override
  Stream<PlayerException> get errorStream => errors.stream;
  @override
  Stream<IcyMetadata?> get icyMetadataStream => const Stream.empty();
  void update(Duration value) {
    position = value;
    event = PlaybackEvent(
        processingState: event.processingState,
        duration: nativeDuration,
        updatePosition: value);
    events.add(event);
  }

  @override
  Future<Duration?> setAudioSource(AudioSource source,
      {bool preload = true,
      int? initialIndex,
      Duration? initialPosition}) async {
    loadCalls++;
    position = initialPosition ?? Duration.zero;
    event = PlaybackEvent(
        processingState: ProcessingState.ready,
        duration: nativeDuration,
        updatePosition: position);
    states.add(playerState);
    events.add(event);
    return nativeDuration;
  }

  @override
  Future<void> seek(Duration? value, {int? index}) async {
    if (rejectSeek) throw StateError('Synthetic unsupported seek');
    seeks.add(value!);
    await seekBarrier?.future;
    if (event.processingState == ProcessingState.completed) {
      event = PlaybackEvent(
          processingState: ProcessingState.ready, duration: nativeDuration);
      states.add(playerState);
    }
    update(value);
  }

  @override
  Future<void> play() async {
    playCalls++;
    playing = true;
    states.add(playerState);
  }

  @override
  Future<void> pause() async {
    playing = false;
    states.add(playerState);
  }

  @override
  Future<void> stop() async {
    playing = false;
    event = PlaybackEvent(processingState: ProcessingState.idle);
    states.add(playerState);
  }

  @override
  Future<void> dispose() async {}
  Future<void> close() async {
    await states.close();
    await events.close();
    await errors.close();
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
