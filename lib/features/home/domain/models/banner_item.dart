class BannerItem {
  const BannerItem({
    required this.id,
    required this.title,
    required this.imageUrl,
    required this.targetType,
    required this.targetId,
    required this.targetUrl,
    required this.priority,
    required this.isActive,
    this.startAt,
    this.expiresAt,
  });

  final String id;
  final String title;
  final String imageUrl;
  final String targetType;
  final String targetId;
  final String targetUrl;
  final int priority;
  final bool isActive;
  final DateTime? startAt;
  final DateTime? expiresAt;

  bool isVisibleAt(DateTime now) {
    final startsInFuture = startAt != null && startAt!.isAfter(now);
    final hasExpired = expiresAt != null && !expiresAt!.isAfter(now);
    return isActive && !startsInFuture && !hasExpired;
  }
}
