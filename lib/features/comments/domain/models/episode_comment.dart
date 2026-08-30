class EpisodeComment {
  const EpisodeComment({
    required this.id,
    required this.episodeId,
    required this.authorId,
    required this.authorName,
    required this.content,
    required this.createdAt,
    required this.isEdited,
  });

  final String id;
  final String episodeId;
  final String authorId;
  final String authorName;
  final String content;
  final DateTime createdAt;
  final bool isEdited;
}
