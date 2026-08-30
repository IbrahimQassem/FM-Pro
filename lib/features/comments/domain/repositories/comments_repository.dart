import '../models/episode_comment.dart';

abstract interface class CommentsRepository {
  Stream<List<EpisodeComment>> watchComments(String episodeId);

  Future<void> addComment({required String episodeId, required String content});
}

enum CommentFailure { authenticationRequired, invalid, unavailable }

class CommentException implements Exception {
  const CommentException(this.failure);

  final CommentFailure failure;
}
