import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/home/domain/models/station.dart';
import 'package:hudhud_fm/features/player/domain/models/audio_playback_item.dart';
import 'package:hudhud_fm/features/player/domain/models/audio_playback_phase.dart';
import 'package:hudhud_fm/features/player/domain/repositories/audio_playback_repository.dart';
import 'package:hudhud_fm/features/player/presentation/controllers/station_player_controller.dart';
import 'package:hudhud_fm/features/player/presentation/controllers/station_player_state.dart';
import 'package:hudhud_fm/features/station_content/domain/models/episode.dart';

void main() {
  testWidgets(
      'a reconnect timer cannot start Android playback after backgrounding',
      (tester) async {
    var foreground = true;
    final repository = _FakeAudioPlaybackRepository();
    final controller =
        StationPlayerController(repository, canStartPlayback: () => foreground);
    await controller.play(_station());
    repository.failPlayback();
    await tester.pump();
    foreground = false;
    await tester.pump(const Duration(seconds: 2));
    expect(repository.playCalls, 1);
    expect(controller.state.status, StationPlaybackStatus.failure);
    foreground = true;
    await controller.retry();
    expect(repository.playCalls, 2);
    controller.dispose();
    await repository.dispose();
  });
  test(
      'backgrounding during a slow load retains the source for retry without starting a service',
      () async {
    var foreground = true;
    final repository = _FakeAudioPlaybackRepository()
      ..delayedLoad = Completer<void>();
    final controller =
        StationPlayerController(repository, canStartPlayback: () => foreground);
    final loading = controller.play(_station());
    await pumpEventQueue();
    foreground = false;
    repository.delayedLoad!.complete();
    await loading;
    expect(repository.playCalls, 0);
    expect(controller.state.station?.id, _station().id);
    expect(controller.state.status, StationPlaybackStatus.failure);
    controller.dispose();
    await repository.dispose();
  });
  testWidgets(
      'live reconnect stops after three attempts instead of resetting its budget',
      (tester) async {
    final repository = _FakeAudioPlaybackRepository();
    final controller = StationPlayerController(repository);
    await controller.play(_station());
    for (var attempt = 1; attempt <= 3; attempt++) {
      repository.emit(AudioPlaybackPhase.playing);
      await tester.pump();
      repository.failPlayback();
      await tester.pump();
      await tester.pump(Duration(seconds: attempt));
      await tester.pump();
      expect(repository.playCalls, attempt + 1);
    }
    repository.emit(AudioPlaybackPhase.playing);
    await tester.pump();
    repository.failPlayback();
    await tester.pump();
    await tester.pump(const Duration(seconds: 10));
    expect(repository.playCalls, 4);
    expect(controller.state.status, StationPlaybackStatus.failure);
    controller.dispose();
    await repository.dispose();
  });
  testWidgets(
      'manual pause cancels reconnect and preserves a usable paused state',
      (tester) async {
    final repository = _FakeAudioPlaybackRepository();
    final controller = StationPlayerController(repository);
    await controller.play(_station());
    repository.failPlayback();
    await tester.pump();
    await controller.pause();
    await tester.pump(const Duration(seconds: 5));
    expect(repository.playCalls, 1);
    expect(controller.state.status, StationPlaybackStatus.paused);
    controller.dispose();
    await repository.dispose();
  });
  test('a newer episode selection supersedes a slow station load', () async {
    final repository = _FakeAudioPlaybackRepository()
      ..delayedLoad = Completer<void>();
    final controller = StationPlayerController(repository);
    final first = controller.play(_station());
    await pumpEventQueue();
    final episode = _episode();
    final second = controller.playEpisode(episode, _station());
    repository.delayedLoad!.complete();
    await Future.wait([first, second]);
    expect(repository.loadedItem?.id, 'episode:${episode.id}');
    expect(repository.playCalls, 1);
    controller.dispose();
    await repository.dispose();
  });
  test('stop during a pending load cannot restart playback', () async {
    final repository = _FakeAudioPlaybackRepository()
      ..delayedLoad = Completer<void>();
    final controller = StationPlayerController(repository);
    final loading = controller.play(_station());
    await pumpEventQueue();
    await controller.stop();
    repository.delayedLoad!.complete();
    await loading;
    expect(repository.playCalls, 0);
    expect(controller.state.station, isNull);
    controller.dispose();
    await repository.dispose();
  });
  test('dispose during a pending load ignores its late failure', () async {
    final repository = _FakeAudioPlaybackRepository()
      ..delayedLoad = Completer<void>();
    final controller = StationPlayerController(repository);
    final loading = controller.play(_station());
    await pumpEventQueue();
    controller.dispose();
    repository.delayedLoad!.completeError(Exception('failure'));
    await loading;
    expect(repository.playCalls, 0);
    await repository.dispose();
  });
  test(
    'loads the primary and backup streams before starting playback',
    () async {
      final repository = _FakeAudioPlaybackRepository();
      final controller = StationPlayerController(repository);
      final station = _station();

      await controller.play(station);

      expect(repository.loadedItem?.id, station.id);
      expect(repository.loadedItem?.title, station.name);
      expect(repository.loadedItem?.artworkUrl, station.logoUrl);
      expect(repository.loadedItem?.streamUrls, [
        station.streamUrl,
        station.backupStreamUrl,
      ]);
      expect(repository.playCalls, 1);
      expect(controller.state.station?.id, station.id);
      expect(controller.state.status, StationPlaybackStatus.loading);

      repository.emit(AudioPlaybackPhase.playing);
      await Future<void>.delayed(Duration.zero);
      expect(controller.state.status, StationPlaybackStatus.playing);

      controller.dispose();
      await repository.dispose();
    },
  );

  test('playing the active station toggles it to paused', () async {
    final repository = _FakeAudioPlaybackRepository();
    final controller = StationPlayerController(repository);
    final station = _station();
    await controller.play(station);
    repository.emit(AudioPlaybackPhase.playing);
    await Future<void>.delayed(Duration.zero);

    await controller.play(station);

    expect(repository.pauseCalls, 1);
    controller.dispose();
    await repository.dispose();
  });

  test('keeps the selected station and exposes a safe failure state', () async {
    final repository = _FakeAudioPlaybackRepository()..shouldFailLoad = true;
    final controller = StationPlayerController(repository);
    final station = _station();

    await controller.play(station);

    expect(controller.state.station?.id, station.id);
    expect(controller.state.status, StationPlaybackStatus.failure);
    controller.dispose();
    await repository.dispose();
  });

  test('clears the selected station when a remote stop reports idle', () async {
    final repository = _FakeAudioPlaybackRepository();
    final controller = StationPlayerController(repository);
    final station = _station();
    await controller.play(station);
    repository.emit(AudioPlaybackPhase.playing);
    await Future<void>.delayed(Duration.zero);

    repository.emit(AudioPlaybackPhase.idle);
    await Future<void>.delayed(Duration.zero);

    expect(controller.state, isA<StationPlayerState>());
    expect(controller.state.station, isNull);
    expect(controller.state.status, StationPlaybackStatus.idle);
    controller.dispose();
    await repository.dispose();
  });

  test('loads an episode into the same shared audio repository', () async {
    final repository = _FakeAudioPlaybackRepository();
    final controller = StationPlayerController(repository);
    final station = _station();
    final episode = _episode();

    await controller.playEpisode(episode, station);

    expect(repository.loadedItem?.id, 'episode:${episode.id}');
    expect(repository.loadedItem?.isLive, false);
    expect(repository.loadedItem?.title, episode.title);
    expect(repository.loadedItem?.album, station.name);
    expect(repository.loadedItem?.streamUrls, [episode.audioUrl]);
    expect(controller.state.isEpisodeSelected(episode.id), isTrue);
    controller.dispose();
    await repository.dispose();
  });

  test('does not attempt to load or play a terrestrial-only station', () async {
    final repository = _FakeAudioPlaybackRepository();
    final controller = StationPlayerController(repository);
    const terrestrialStation = Station(
      id: 'aden-radio',
      name: 'إذاعة عدن',
      streamUrl: '',
      frequency: '105.0 MHz',
      countryCode: 'YE',
      countryNameAr: 'اليمن',
      cityCode: 'aden',
      cityNameAr: 'عدن',
      priority: 10,
      isLive: false,
      isActive: true,
      isVerified: false,
      isFeatured: false,
      programsCount: 0,
      subscribersCount: 0,
      totalPlays: 0,
    );

    await controller.play(terrestrialStation);

    expect(repository.loadedItem, isNull);
    expect(repository.playCalls, 0);
    expect(controller.state.station, isNull);
    controller.dispose();
    await repository.dispose();
  });

  test('sets and cancels sleep timer', () async {
    final repository = _FakeAudioPlaybackRepository();
    final controller = StationPlayerController(repository);
    final station = _station();
    await controller.play(station);

    controller.setSleepTimer(const Duration(minutes: 30));
    expect(controller.state.hasSleepTimer, isTrue);
    expect(controller.state.remainingSleepTime, isNotNull);

    controller.cancelSleepTimer();
    expect(controller.state.hasSleepTimer, isFalse);
    expect(controller.state.remainingSleepTime, isNull);

    controller.dispose();
    await repository.dispose();
  });

  test('playNextStation and playPreviousStation cycle through stations',
      () async {
    final repository = _FakeAudioPlaybackRepository();
    final controller = StationPlayerController(repository);
    final station1 = _station();
    const station2 = Station(
      id: 'taiz-radio',
      name: 'إذاعة تعز',
      streamUrl: 'https://radio.example.com/taiz',
      countryCode: 'YE',
      countryNameAr: 'اليمن',
      cityCode: 'taiz',
      cityNameAr: 'تعز',
      priority: 9,
      isLive: true,
      isActive: true,
      isVerified: true,
      isFeatured: false,
      programsCount: 2,
      subscribersCount: 80,
      totalPlays: 200,
    );

    await controller.play(station1);
    expect(controller.state.station?.id, station1.id);

    controller.playNextStation([station1, station2]);
    expect(controller.state.station?.id, station2.id);

    controller.playPreviousStation([station1, station2]);
    expect(controller.state.station?.id, station1.id);

    controller.dispose();
    await repository.dispose();
  });
}

Station _station() {
  return const Station(
    id: 'sanaa-radio',
    name: 'إذاعة صنعاء',
    logoUrl: 'https://images.example.com/sanaa-radio.png',
    streamUrl: 'https://radio.example.com/live',
    backupStreamUrl: 'https://backup.example.com/live',
    countryCode: 'YE',
    countryNameAr: 'اليمن',
    cityCode: 'sanaa',
    cityNameAr: 'صنعاء',
    priority: 10,
    isLive: true,
    isActive: true,
    isVerified: true,
    isFeatured: true,
    programsCount: 4,
    subscribersCount: 120,
    totalPlays: 400,
  );
}

Episode _episode() {
  return Episode(
    id: 'episode-1',
    programId: 'morning',
    stationId: 'sanaa-radio',
    title: 'حلقة التعليم',
    audioUrl: 'https://audio.example.com/episode.mp3',
    durationSeconds: 1800,
    priority: 10,
    isPublished: true,
    isFeatured: false,
    broadcastAt: DateTime.utc(2026, 8, 29, 5),
    utcOffsetMinutes: 180,
    playsCount: 10,
    likesCount: 1,
    commentsCount: 0,
  );
}

class _FakeAudioPlaybackRepository implements AudioPlaybackRepository {
  Completer<void>? delayedLoad;
  final _phases = StreamController<AudioPlaybackPhase>.broadcast();

  AudioPlaybackItem? loadedItem;
  int playCalls = 0;
  int pauseCalls = 0;
  bool shouldFailLoad = false;

  @override
  Stream<AudioPlaybackPhase> get phaseChanges => _phases.stream;

  void emit(AudioPlaybackPhase phase) => _phases.add(phase);
  void failPlayback() =>
      _phases.addError(StateError('Synthetic disconnect'), StackTrace.current);

  @override
  Future<void> load(AudioPlaybackItem item) async {
    loadedItem = item;
    await delayedLoad?.future;
    if (shouldFailLoad) throw const FormatException('Invalid test stream');
  }

  @override
  Future<void> pause() async {
    pauseCalls++;
  }

  @override
  Future<void> play() async {
    playCalls++;
  }

  @override
  Future<void> stop() async {}

  Future<void> dispose() => _phases.close();
}
