import '../models/favorite_item.dart';

enum FavoritesFailure {
  network,
  unauthenticated,
  emailUnverified,
  server,
  unknown;
}

class FavoritesException implements Exception {
  const FavoritesException(this.failure, [this.message]);

  final FavoritesFailure failure;
  final String? message;

  @override
  String toString() => 'FavoritesException(\$failure, message: \$message)';
}

abstract interface class FavoritesRepository {
  /// Watches the set of favorite target IDs for a given user and target type.
  Stream<Set<String>> watchFavoriteTargetIds({
    required String uid,
    required FavoriteTargetType targetType,
  });

  /// Adds a target to the user's favorites collection.
  Future<void> addFavorite({
    required String uid,
    required FavoriteTargetType targetType,
    required String targetId,
  });

  /// Removes a target from the user's favorites collection.
  Future<void> removeFavorite({
    required String uid,
    required FavoriteTargetType targetType,
    required String targetId,
  });
}
