import '../../domain/models/audio_playback_item.dart';
import '../../domain/models/audio_playback_phase.dart';
import '../../domain/repositories/audio_playback_repository.dart';
import '../datasources/audio_player_data_source.dart';

class DefaultAudioPlaybackRepository implements AudioPlaybackRepository {
  const DefaultAudioPlaybackRepository(this._dataSource);

  final AudioPlayerDataSource _dataSource;

  @override
  Stream<AudioPlaybackPhase> get phaseChanges => _dataSource.phaseChanges;

  @override
  Future<void> load(AudioPlaybackItem item) => _dataSource.load(item);

  @override
  Future<void> pause() => _dataSource.pause();

  @override
  Future<void> play() => _dataSource.play();

  @override
  Future<void> stop() => _dataSource.stop();
}
