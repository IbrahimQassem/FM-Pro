import '../models/audio_playback_item.dart';
import '../models/audio_playback_phase.dart';

abstract interface class AudioPlaybackRepository {
  Stream<AudioPlaybackPhase> get phaseChanges;

  Future<void> load(AudioPlaybackItem item);

  Future<void> play();

  Future<void> pause();

  Future<void> stop();
}
