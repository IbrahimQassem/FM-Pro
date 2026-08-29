class Episode {
  const Episode({
    required this.id,
    required this.programId,
    required this.stationId,
    required this.title,
    required this.audioUrl,
    required this.durationSeconds,
    required this.priority,
    required this.isPublished,
    required this.isFeatured,
    required this.broadcastAt,
    required this.utcOffsetMinutes,
    required this.playsCount,
    required this.likesCount,
    required this.commentsCount,
    this.description = '',
    this.coverUrl = '',
    this.presenter = '',
    this.guest = '',
    this.publishedAt,
  });

  final String id;
  final String programId;
  final String stationId;
  final String title;
  final String description;
  final String audioUrl;
  final int durationSeconds;
  final String coverUrl;
  final String presenter;
  final String guest;
  final int priority;
  final bool isPublished;
  final bool isFeatured;
  final DateTime broadcastAt;
  final int utcOffsetMinutes;
  final DateTime? publishedAt;
  final int playsCount;
  final int likesCount;
  final int commentsCount;
}
