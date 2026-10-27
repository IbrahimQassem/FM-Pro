import 'package:hudhud_fm/features/player/domain/models/audio_playback_progress.dart';
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
  test('seek accepts only a ready selected episode and preserves pause',
      () async {
    final repository = _FakeAudioPlaybackRepository();
    final controller = StationPlayerController(repository);
    expect(
        await controller.seek(const Duration(seconds: 9),
            episodeId: _episode().id),
        false);
    await controller.playEpisode(_episode(), _station());
    expect(
        await controller.seek(const Duration(seconds: 9),
            episodeId: _episode().id),
        false);
    repository.emit(AudioPlaybackPhase.playing);
    await pumpEventQueue();
    await controller.pause();
    expect(
        await controller.seek(const Duration(seconds: 9), episodeId: 'wrong'),
        false);
    expect(
        await controller.seek(const Duration(seconds: 9),
            episodeId: _episode().id),
        true);
    expect(repository.seekItems, ['episode:episode-1']);
    expect(repository.playCalls, 1);
    expect(repository.pauseCalls, 1);
    expect(controller.state.status, StationPlaybackStatus.paused);
    controller.dispose();
    await repository.dispose();
  });
  test(
      'source replacement waits for an in-flight seek and cancels queued old seeks',
      () async {
    final repository = _FakeAudioPlaybackRepository();
    final controller = StationPlayerController(repository);
    await controller.playEpisode(_episode(), _station());
    repository.emit(AudioPlaybackPhase.playing);
    await pumpEventQueue();
    repository.delayedSeek = Completer<void>();
    final seeking =
        controller.seek(const Duration(seconds: 9), episodeId: _episode().id);
    await pumpEventQueue();
    final obsolete =
        controller.seek(const Duration(seconds: 20), episodeId: _episode().id);
    final replacement = controller.play(_station());
    await pumpEventQueue();
    expect(repository.loadedItem!.id, 'episode:episode-1');
    repository.delayedSeek!.complete();
    expect(await seeking, false);
    expect(await obsolete, false);
    await replacement;
    expect(repository.loadedItem!.id, _station().id);
    expect(repository.seekItems, ['episode:episode-1']);
    expect(
        await controller.seek(const Duration(seconds: 9),
            episodeId: _episode().id),
        false);
    controller.dispose();
    await repository.dispose();
  });
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

  test('updates streamTitle when icy title changes during station playback',
      () async {
    final repository = _FakeAudioPlaybackRepository();
    final controller = StationPlayerController(repository);
    final station = _station();

    await controller.play(station);
    expect(controller.state.streamTitle, isNull);

    repository.emitIcy('برنامج البث المباشر - الحلقة 1');
    await Future<void>.delayed(Duration.zero);
    expect(controller.state.streamTitle, 'برنامج البث المباشر - الحلقة 1');

    repository.emitIcy('  ');
    await Future<void>.delayed(Duration.zero);
    expect(controller.state.streamTitle, isNull);

    controller.dispose();
    await repository.dispose();
  });
  testWidgets(
      'sleep deadline stays visible and unchanged across episode switches',
      (tester) async {
    final repository = _FakeAudioPlaybackRepository();
    final controller = StationPlayerController(repository);
    addTearDown(() async {
      controller.dispose();
      await repository.dispose();
    });
    await controller.play(_station());
    controller.setSleepTimer(const Duration(minutes: 15));
    final deadline = controller.state.sleepTimerEnd;
    await controller.playEpisode(_episode(), _station());
    expect(controller.state.sleepTimerEnd, deadline);
    expect(controller.state.hasSleepTimer, true);
    await controller.playEpisode(_episode(id: 'episode-2'), _station());
    expect(controller.state.sleepTimerEnd, deadline);
    await controller.play(_station());
    expect(controller.state.sleepTimerEnd, deadline);
    await controller.stop();
  });

  testWidgets('sleep remote stop cancels the old deadline before a new session',
      (tester) async {
    final repository = _FakeAudioPlaybackRepository();
    final controller = StationPlayerController(repository);
    addTearDown(() async {
      controller.dispose();
      await repository.dispose();
    });
    await controller.play(_station());
    controller.setSleepTimer(const Duration(seconds: 10));
    repository.emit(AudioPlaybackPhase.idle);
    await tester.pump();
    expect(controller.state.sleepTimerEnd, isNull);
    await controller.playEpisode(_episode(), _station());
    await tester.pump(const Duration(seconds: 11));
    expect(repository.stopCalls, 0);
    expect(controller.state.isEpisodeSelected(_episode().id), true);
  });

  testWidgets(
      'sleep pause and episode retry preserve the deadline until expiry',
      (tester) async {
    final repository = _FakeAudioPlaybackRepository();
    final controller = StationPlayerController(repository);
    addTearDown(() async {
      controller.dispose();
      await repository.dispose();
    });
    await controller.playEpisode(_episode(), _station());
    controller.setSleepTimer(const Duration(seconds: 10));
    final deadline = controller.state.sleepTimerEnd;
    await controller.pause();
    expect(controller.state.sleepTimerEnd, deadline);
    await controller.retry();
    expect(controller.state.sleepTimerEnd, deadline);
    await tester.pump(const Duration(seconds: 11));
    expect(repository.stopCalls, 1);
    expect(controller.state.hasSelection, false);
  });

  testWidgets(
      'sleep cancellation local stop and disposal prevent late callbacks',
      (tester) async {
    final repository = _FakeAudioPlaybackRepository();
    final controller = StationPlayerController(repository);
    await controller.play(_station());
    controller.setSleepTimer(const Duration(seconds: 10));
    controller.cancelSleepTimer();
    await tester.pump(const Duration(seconds: 11));
    expect(repository.stopCalls, 0);
    controller.setSleepTimer(const Duration(seconds: 10));
    await controller.stop();
    await tester.pump(const Duration(seconds: 11));
    expect(repository.stopCalls, 1);
    await controller.play(_station());
    controller.setSleepTimer(const Duration(seconds: 10));
    controller.dispose();
    await tester.pump(const Duration(seconds: 11));
    expect(repository.stopCalls, 1);
    await repository.dispose();
  });
  test(
      'sleep pending local stop cannot lend its visible deadline to a new session',
      () async {
    final repository = _FakeAudioPlaybackRepository()
      ..delayedStop = Completer<void>();
    final controller = StationPlayerController(repository);
    addTearDown(() async {
      if (!repository.delayedStop!.isCompleted) {
        repository.delayedStop!.complete();
      }
      controller.dispose();
      await repository.dispose();
    });
    await controller.play(_station());
    controller.setSleepTimer(const Duration(minutes: 15));
    final stopping = controller.stop();
    await pumpEventQueue();
    await controller.playEpisode(_episode(), _station());
    expect(controller.state.sleepTimerEnd, isNull);
    repository.delayedStop!.complete();
    await stopping;
    expect(controller.state.isEpisodeSelected(_episode().id), true);
  });

  test(
      'replay completed episode rewinds before play without replacing the source',
      () async {
    final repository = _FakeAudioPlaybackRepository();
    final controller = await _completedEpisode(repository);
    addTearDown(() async {
      controller.dispose();
      await repository.dispose();
    });
    await controller.toggleCurrent();
    await pumpEventQueue();
    expect(repository.seekPositions, [Duration.zero]);
    expect(repository.position, Duration.zero);
    expect(repository.loadCalls, 1);
    expect(repository.playCalls, 2);
    expect(controller.state.status, StationPlaybackStatus.playing);
  });

  for (final replaceWithEpisode in [false, true]) {
    test(
        'replay waits for rewind and cancels play after ${replaceWithEpisode ? "episode" : "live"} replacement',
        () async {
      final repository = _FakeAudioPlaybackRepository();
      final controller = await _completedEpisode(repository);
      repository.delayedSeek = Completer<void>();
      addTearDown(() async {
        if (!repository.delayedSeek!.isCompleted) {
          repository.delayedSeek!.complete();
        }
        controller.dispose();
        await repository.dispose();
      });
      final replaying = controller.toggleCurrent();
      await pumpEventQueue();
      expect(repository.seekPositions, [Duration.zero]);
      final replacement = replaceWithEpisode
          ? controller.playEpisode(_episode(id: 'replacement'), _station())
          : controller.play(_station());
      await pumpEventQueue();
      expect(repository.loadCalls, 1);
      repository.delayedSeek!.complete();
      await Future.wait([replaying, replacement]);
      await pumpEventQueue();
      expect(repository.loadedItem!.id,
          replaceWithEpisode ? 'episode:replacement' : _station().id);
      expect(repository.playCalls, 2);
      expect(repository.loadCalls, 2);
    });
  }

  for (final action in ['pause', 'stop', 'dispose']) {
    test('replay never starts playback after $action during rewind', () async {
      final repository = _FakeAudioPlaybackRepository();
      final controller = await _completedEpisode(repository);
      repository.delayedSeek = Completer<void>();
      var disposed = false;
      addTearDown(() async {
        if (!repository.delayedSeek!.isCompleted) {
          repository.delayedSeek!.complete();
        }
        if (!disposed) controller.dispose();
        await repository.dispose();
      });
      final replaying = controller.toggleCurrent();
      await pumpEventQueue();
      expect(repository.seekPositions, [Duration.zero]);
      if (action == 'pause') await controller.pause();
      if (action == 'stop') await controller.stop();
      if (action == 'dispose') {
        controller.dispose();
        disposed = true;
      }
      repository.delayedSeek!.complete();
      await replaying;
      await pumpEventQueue();
      expect(repository.playCalls, 1);
      if (!disposed) {
        expect(
            controller.state.status,
            action == 'stop'
                ? StationPlaybackStatus.idle
                : StationPlaybackStatus.paused);
      }
    });
  }

  test('replay repeated play requests share one rewind and one playback start',
      () async {
    final repository = _FakeAudioPlaybackRepository();
    final controller = await _completedEpisode(repository);
    repository.delayedSeek = Completer<void>();
    addTearDown(() async {
      if (!repository.delayedSeek!.isCompleted) {
        repository.delayedSeek!.complete();
      }
      controller.dispose();
      await repository.dispose();
    });
    final first = controller.resume();
    await pumpEventQueue();
    final second = controller.resume();
    repository.delayedSeek!.complete();
    await Future.wait([first, second]);
    await pumpEventQueue();
    expect(repository.seekPositions, [Duration.zero]);
    expect(repository.playCalls, 2);
  });

  for (final throwsSeek in [false, true]) {
    test(
        'replay ${throwsSeek ? "throwing" : "unavailable"} seek reloads only the selected episode',
        () async {
      final repository = _FakeAudioPlaybackRepository();
      final controller = await _completedEpisode(repository);
      repository.rejectSeek = !throwsSeek;
      repository.throwsSeek = throwsSeek;
      addTearDown(() async {
        controller.dispose();
        await repository.dispose();
      });
      await controller.toggleCurrent();
      await pumpEventQueue();
      expect(repository.loadCalls, 2);
      expect(repository.loadedItem!.id, 'episode:episode-1');
      expect(repository.position, Duration.zero);
      expect(repository.playCalls, 2);
      expect(controller.state.status, StationPlaybackStatus.playing);
    });
  }

  test(
      'replay reload failure keeps a retryable selection without remaining loading',
      () async {
    final repository = _FakeAudioPlaybackRepository();
    final controller = await _completedEpisode(repository);
    repository.rejectSeek = true;
    repository.shouldFailLoad = true;
    addTearDown(() async {
      controller.dispose();
      await repository.dispose();
    });
    await controller.toggleCurrent();
    await pumpEventQueue();
    expect(repository.loadCalls, 2);
    expect(repository.playCalls, 1);
    expect(controller.state.status, StationPlaybackStatus.failure);
    expect(controller.state.isEpisodeSelected(_episode().id), true);
  });

  test('replay checks foreground eligibility again after awaiting rewind',
      () async {
    var foreground = true;
    final repository = _FakeAudioPlaybackRepository();
    final controller =
        await _completedEpisode(repository, canStartPlayback: () => foreground);
    repository.delayedSeek = Completer<void>();
    addTearDown(() async {
      if (!repository.delayedSeek!.isCompleted) {
        repository.delayedSeek!.complete();
      }
      controller.dispose();
      await repository.dispose();
    });
    final replaying = controller.toggleCurrent();
    await pumpEventQueue();
    expect(repository.seekPositions, [Duration.zero]);
    foreground = false;
    repository.delayedSeek!.complete();
    await replaying;
    expect(repository.playCalls, 1);
    expect(controller.state.status, StationPlaybackStatus.failure);
  });
}

Future<StationPlayerController> _completedEpisode(
    _FakeAudioPlaybackRepository repository,
    {bool Function()? canStartPlayback}) async {
  repository.emitPlayPhase = true;
  final controller =
      StationPlayerController(repository, canStartPlayback: canStartPlayback);
  await controller.playEpisode(_episode(), _station());
  repository.position = const Duration(seconds: 60);
  repository.emit(AudioPlaybackPhase.completed);
  await pumpEventQueue();
  return controller;
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

Episode _episode({String id = 'episode-1'}) {
  return Episode(
    id: id,
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
  Completer<void>? delayedSeek;
  Completer<void>? delayedStop;
  final seekItems = <String>[];
  final _phases = StreamController<AudioPlaybackPhase>.broadcast();
  final _icy = StreamController<String?>.broadcast();

  AudioPlaybackItem? loadedItem;
  int playCalls = 0;
  int loadCalls = 0;
  Duration position = Duration.zero;
  final seekPositions = <Duration>[];
  bool rejectSeek = false;
  bool throwsSeek = false;
  bool emitPlayPhase = false;
  int pauseCalls = 0;
  int stopCalls = 0;
  bool shouldFailLoad = false;

  @override
  Stream<AudioPlaybackPhase> get phaseChanges => _phases.stream;

  @override
  Stream<String?> get icyTitleChanges => _icy.stream;

  @override
  Stream<AudioPlaybackProgress> get progressChanges => const Stream.empty();

  @override
  Future<bool> seek(Duration position, {required String itemId}) async {
    seekItems.add(itemId);
    seekPositions.add(position);
    if (throwsSeek) throw StateError('Synthetic rejected rewind');
    if (rejectSeek) return false;
    await delayedSeek?.future;
    this.position = position;
    return true;
  }

  void emit(AudioPlaybackPhase phase) => _phases.add(phase);
  void emitIcy(String? title) => _icy.add(title);
  void failPlayback() =>
      _phases.addError(StateError('Synthetic disconnect'), StackTrace.current);

  @override
  Future<void> load(AudioPlaybackItem item) async {
    loadCalls++;
    loadedItem = item;
    position = Duration.zero;
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
    if (emitPlayPhase) emit(AudioPlaybackPhase.playing);
  }

  @override
  Future<void> stop() async {
    stopCalls++;
    await delayedStop?.future;
  }

  Future<void> dispose() => _phases.close();
}
