import '../../../home/domain/models/station.dart';

enum StationPlaybackStatus { idle, loading, playing, paused, failure }

class StationPlayerState {
  const StationPlayerState({
    this.station,
    this.status = StationPlaybackStatus.idle,
  });

  final Station? station;
  final StationPlaybackStatus status;

  bool isSelected(String stationId) => station?.id == stationId;

  StationPlayerState copyWith({
    Station? station,
    StationPlaybackStatus? status,
  }) {
    return StationPlayerState(
      station: station ?? this.station,
      status: status ?? this.status,
    );
  }
}
