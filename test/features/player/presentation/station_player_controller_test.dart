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
    expect(repository.loadedItem?.title, episode.title);
    expect(repository.loadedItem?.album, station.name);
    expect(repository.loadedItem?.streamUrls, [episode.audioUrl]);
    expect(controller.state.isEpisodeSelected(episode.id), isTrue);
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
  final _phases = StreamController<AudioPlaybackPhase>.broadcast();

  AudioPlaybackItem? loadedItem;
  int playCalls = 0;
  int pauseCalls = 0;
  bool shouldFailLoad = false;

  @override
  Stream<AudioPlaybackPhase> get phaseChanges => _phases.stream;

  void emit(AudioPlaybackPhase phase) => _phases.add(phase);

  @override
  Future<void> load(AudioPlaybackItem item) async {
    loadedItem = item;
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
