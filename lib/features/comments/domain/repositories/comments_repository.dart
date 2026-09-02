import '../models/episode_comment.dart';

const currentUgcTermsVersion = '2026-09-01';

abstract interface class CommentsRepository {
  Stream<List<EpisodeComment>> watchComments(String episodeId);

  Future<Set<String>> loadBlockedAuthorIds();

  Future<bool> hasAcceptedCurrentTerms();

  Future<void> acceptCurrentTerms();

  Future<void> addComment({required String episodeId, required String content});

  Future<void> reportComment({
    required EpisodeComment comment,
    required CommentReportReason reason,
    required String details,
  });

  Future<void> reportUser({
    required EpisodeComment sourceComment,
    required CommentReportReason reason,
    required String details,
  });

  Future<void> blockAuthor(String authorId);

  Future<void> unblockAuthor(String authorId);
}

enum CommentReportReason {
  harassment,
  hate,
  sexualContent,
  violence,
  spam,
  privacy,
  other,
}

enum CommentModerationFailure {
  authenticationRequired,
  invalid,
  alreadyReported,
  unavailable,
}

class CommentModerationException implements Exception {
  const CommentModerationException(this.failure);

  final CommentModerationFailure failure;
}

enum CommentFailure {
  authenticationRequired,
  termsAcceptanceRequired,
  invalid,
  unavailable,
}

class CommentException implements Exception {
  const CommentException(this.failure);

  final CommentFailure failure;
}
