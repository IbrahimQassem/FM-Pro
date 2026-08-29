import '../../domain/models/audio_playback_item.dart';
import '../../domain/models/audio_playback_phase.dart';

abstract interface class AudioPlayerDataSource {
  Stream<AudioPlaybackPhase> get phaseChanges;

  Future<void> load(AudioPlaybackItem item);

  Future<void> play();

  Future<void> pause();

  Future<void> stop();

  Future<void> dispose();
}

class AudioSourceUnavailableException implements Exception {
  const AudioSourceUnavailableException();
}
