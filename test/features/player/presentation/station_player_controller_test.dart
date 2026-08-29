import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/home/domain/models/station.dart';
import 'package:hudhud_fm/features/player/domain/models/audio_playback_phase.dart';
import 'package:hudhud_fm/features/player/domain/repositories/audio_playback_repository.dart';
import 'package:hudhud_fm/features/player/presentation/controllers/station_player_controller.dart';
import 'package:hudhud_fm/features/player/presentation/controllers/station_player_state.dart';

void main() {
  test(
    'loads the primary and backup streams before starting playback',
    () async {
      final repository = _FakeAudioPlaybackRepository();
      final controller = StationPlayerController(repository);
      final station = _station();

      await controller.play(station);

      expect(repository.loadedUrls, [
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
}

Station _station() {
  return const Station(
    id: 'sanaa-radio',
    name: 'إذاعة صنعاء',
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

class _FakeAudioPlaybackRepository implements AudioPlaybackRepository {
  final _phases = StreamController<AudioPlaybackPhase>.broadcast();

  List<String> loadedUrls = const [];
  int playCalls = 0;
  int pauseCalls = 0;
  bool shouldFailLoad = false;

  @override
  Stream<AudioPlaybackPhase> get phaseChanges => _phases.stream;

  void emit(AudioPlaybackPhase phase) => _phases.add(phase);

  @override
  Future<void> load(List<String> streamUrls) async {
    loadedUrls = streamUrls;
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
