import '../../domain/repositories/favorites_repository.dart';

class FavoritesState {
  const FavoritesState({
    this.favoriteStationIds = const {},
    this.pendingStationIds = const {},
    this.isLoading = false,
    this.lastFailure,
  });

  final Set<String> favoriteStationIds;
  final Set<String> pendingStationIds;
  final bool isLoading;
  final FavoritesFailure? lastFailure;

  bool isFavorite(String stationId) => favoriteStationIds.contains(stationId);
  bool isPending(String stationId) => pendingStationIds.contains(stationId);

  FavoritesState copyWith({
    Set<String>? favoriteStationIds,
    Set<String>? pendingStationIds,
    bool? isLoading,
    FavoritesFailure? lastFailure,
    bool clearFailure = false,
  }) {
    return FavoritesState(
      favoriteStationIds: favoriteStationIds ?? this.favoriteStationIds,
      pendingStationIds: pendingStationIds ?? this.pendingStationIds,
      isLoading: isLoading ?? this.isLoading,
      lastFailure: clearFailure ? null : (lastFailure ?? this.lastFailure),
    );
  }
}
