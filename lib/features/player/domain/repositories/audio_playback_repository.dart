import '../models/audio_playback_progress.dart';
import '../models/audio_playback_item.dart';
import '../models/audio_playback_phase.dart';

abstract interface class AudioPlaybackRepository {
  Stream<AudioPlaybackPhase> get phaseChanges;

  Stream<String?> get icyTitleChanges;

  Stream<AudioPlaybackProgress> get progressChanges;

  Future<bool> seek(Duration position, {required String itemId});

  Future<void> load(AudioPlaybackItem item);

  Future<void> play();

  Future<void> pause();

  Future<void> stop();
}
