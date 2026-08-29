import '../../../home/domain/models/station.dart';
import '../../../station_content/domain/models/episode.dart';

enum StationPlaybackStatus { idle, loading, playing, paused, failure }

class StationPlayerState {
  const StationPlayerState({
    this.station,
    this.episode,
    this.status = StationPlaybackStatus.idle,
  });

  final Station? station;
  final Episode? episode;
  final StationPlaybackStatus status;

  bool isSelected(String stationId) =>
      episode == null && station?.id == stationId;

  bool isEpisodeSelected(String episodeId) => episode?.id == episodeId;

  bool get hasSelection => station != null;

  String get title => episode?.title ?? station?.name ?? '';

  String get artworkUrl => episode?.coverUrl.isNotEmpty == true
      ? episode!.coverUrl
      : station?.logoUrl ?? '';

  StationPlayerState copyWith({
    Station? station,
    StationPlaybackStatus? status,
  }) {
    return StationPlayerState(
      station: station ?? this.station,
      episode: episode,
      status: status ?? this.status,
    );
  }
}
