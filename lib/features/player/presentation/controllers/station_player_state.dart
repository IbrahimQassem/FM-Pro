import '../../../home/domain/models/station.dart';
import '../../../station_content/domain/models/episode.dart';

enum StationPlaybackStatus { idle, loading, playing, paused, failure }

class StationPlayerState {
  const StationPlayerState({
    this.station,
    this.episode,
    this.status = StationPlaybackStatus.idle,
    this.sleepTimerEnd,
  });

  final Station? station;
  final Episode? episode;
  final StationPlaybackStatus status;
  final DateTime? sleepTimerEnd;

  bool isSelected(String stationId) =>
      episode == null && station?.id == stationId;

  bool isEpisodeSelected(String episodeId) => episode?.id == episodeId;

  bool get hasSelection => station != null;

  String get title => episode?.title ?? station?.name ?? '';

  String get artworkUrl => episode?.coverUrl.isNotEmpty == true
      ? episode!.coverUrl
      : station?.logoUrl ?? '';

  bool get hasSleepTimer =>
      sleepTimerEnd != null && sleepTimerEnd!.isAfter(DateTime.now());

  Duration? get remainingSleepTime =>
      hasSleepTimer ? sleepTimerEnd!.difference(DateTime.now()) : null;

  StationPlayerState copyWith({
    Station? station,
    Episode? episode,
    StationPlaybackStatus? status,
    DateTime? sleepTimerEnd,
    bool clearSleepTimer = false,
  }) {
    return StationPlayerState(
      station: station ?? this.station,
      episode: episode ?? this.episode,
      status: status ?? this.status,
      sleepTimerEnd:
          clearSleepTimer ? null : (sleepTimerEnd ?? this.sleepTimerEnd),
    );
  }
}
