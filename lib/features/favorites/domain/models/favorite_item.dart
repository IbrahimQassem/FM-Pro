enum FavoriteTargetType {
  station,
  program,
  episode;

  static FavoriteTargetType fromString(String value) {
    return switch (value) {
      "station" => FavoriteTargetType.station,
      "program" => FavoriteTargetType.program,
      "episode" => FavoriteTargetType.episode,
      _ => throw ArgumentError("Unsupported favorite target type: $value"),
    };
  }
}

class FavoriteItem {
  const FavoriteItem({
    required this.id,
    required this.targetType,
    required this.targetId,
    required this.createdAt,
  });

  final String id;
  final FavoriteTargetType targetType;
  final String targetId;
  final DateTime createdAt;

  static String deterministicId(FavoriteTargetType type, String targetId) =>
      "${type.name}_$targetId";
}
