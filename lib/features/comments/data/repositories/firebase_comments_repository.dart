import 'package:cloud_firestore/cloud_firestore.dart';

import '../../domain/models/episode_comment.dart';
import '../../domain/repositories/comments_repository.dart';
import '../datasources/comments_firestore_data_source.dart';

class FirebaseCommentsRepository implements CommentsRepository {
  const FirebaseCommentsRepository(this._dataSource);

  final CommentsFirestoreDataSource _dataSource;

  @override
  Future<Set<String>> loadBlockedAuthorIds() async {
    try {
      return await _dataSource.loadBlockedAuthorIds();
    } on FirebaseException {
      throw const CommentModerationException(
        CommentModerationFailure.unavailable,
      );
    }
  }

  @override
  Stream<List<EpisodeComment>> watchComments(String episodeId) {
    return _dataSource.watchComments(episodeId).map((snapshot) {
      final comments = <EpisodeComment>[];
      for (final document in snapshot.docs) {
        final comment = _map(document);
        if (comment != null) comments.add(comment);
      }
      return List.unmodifiable(comments);
    });
  }

  @override
  Future<bool> hasAcceptedCurrentTerms() async {
    try {
      return await _dataSource.hasAcceptedCurrentTerms();
    } on FirebaseException {
      throw const CommentException(CommentFailure.unavailable);
    }
  }

  @override
  Future<void> acceptCurrentTerms() async {
    try {
      await _dataSource.acceptCurrentTerms();
    } on CommentAuthRequiredException {
      throw const CommentException(CommentFailure.authenticationRequired);
    } on FirebaseException {
      throw const CommentException(CommentFailure.unavailable);
    }
  }

  @override
  Future<void> addComment({
    required String episodeId,
    required String content,
  }) async {
    final cleanContent = content.trim();
    if (cleanContent.isEmpty || cleanContent.length > 1000) {
      throw const CommentException(CommentFailure.invalid);
    }
    try {
      await _dataSource.addComment(episodeId: episodeId, content: cleanContent);
    } on CommentAuthRequiredException {
      throw const CommentException(CommentFailure.authenticationRequired);
    } on CommentTermsAcceptanceRequiredException {
      throw const CommentException(CommentFailure.termsAcceptanceRequired);
    } on CommentProfileUnavailableException {
      throw const CommentException(CommentFailure.unavailable);
    } on FirebaseException {
      throw const CommentException(CommentFailure.unavailable);
    }
  }

  @override
  Future<void> reportComment({
    required EpisodeComment comment,
    required CommentReportReason reason,
    required String details,
  }) async {
    final cleanDetails = details.trim();
    if (comment.id.isEmpty ||
        comment.episodeId.isEmpty ||
        comment.authorId.isEmpty ||
        cleanDetails.length > 500) {
      throw const CommentModerationException(CommentModerationFailure.invalid);
    }
    try {
      await _dataSource.reportComment(
        comment: comment,
        reason: reason,
        details: cleanDetails,
      );
    } on CommentAuthRequiredException {
      throw const CommentModerationException(
        CommentModerationFailure.authenticationRequired,
      );
    } on CommentAlreadyReportedException {
      throw const CommentModerationException(
        CommentModerationFailure.alreadyReported,
      );
    } on FirebaseException {
      throw const CommentModerationException(
        CommentModerationFailure.unavailable,
      );
    }
  }

  @override
  Future<void> reportUser({
    required EpisodeComment sourceComment,
    required CommentReportReason reason,
    required String details,
  }) async {
    final cleanDetails = details.trim();
    if (sourceComment.id.isEmpty ||
        sourceComment.episodeId.isEmpty ||
        sourceComment.authorId.isEmpty ||
        cleanDetails.length > 500) {
      throw const CommentModerationException(CommentModerationFailure.invalid);
    }
    try {
      await _dataSource.reportUser(
        sourceComment: sourceComment,
        reason: reason,
        details: cleanDetails,
      );
    } on CommentAuthRequiredException {
      throw const CommentModerationException(
        CommentModerationFailure.authenticationRequired,
      );
    } on CommentAlreadyReportedException {
      throw const CommentModerationException(
        CommentModerationFailure.alreadyReported,
      );
    } on FirebaseException {
      throw const CommentModerationException(
        CommentModerationFailure.unavailable,
      );
    }
  }

  @override
  Future<void> blockAuthor(String authorId) async {
    try {
      await _dataSource.blockAuthor(authorId.trim());
    } on CommentAuthRequiredException {
      throw const CommentModerationException(
        CommentModerationFailure.authenticationRequired,
      );
    } on CommentModerationInputException {
      throw const CommentModerationException(CommentModerationFailure.invalid);
    } on FirebaseException {
      throw const CommentModerationException(
        CommentModerationFailure.unavailable,
      );
    }
  }

  @override
  Future<void> unblockAuthor(String authorId) async {
    try {
      await _dataSource.unblockAuthor(authorId.trim());
    } on CommentAuthRequiredException {
      throw const CommentModerationException(
        CommentModerationFailure.authenticationRequired,
      );
    } on FirebaseException {
      throw const CommentModerationException(
        CommentModerationFailure.unavailable,
      );
    }
  }

  static EpisodeComment? _map(
    QueryDocumentSnapshot<Map<String, dynamic>> document,
  ) {
    final data = document.data();
    final episodeId = _text(data['episodeId']);
    final authorId = _text(data['authorId']);
    final authorName = _text(data['authorName']);
    final content = _text(data['content']);
    final createdAt = data['createdAt'];
    final isEdited = data['isEdited'];
    final status = _text(data['status']);
    if (document.id.isEmpty ||
        episodeId.isEmpty ||
        authorId.isEmpty ||
        authorName.isEmpty ||
        content.isEmpty ||
        content.length > 1000 ||
        createdAt is! Timestamp ||
        isEdited is! bool ||
        status != 'published') {
      return null;
    }
    return EpisodeComment(
      id: document.id,
      episodeId: episodeId,
      authorId: authorId,
      authorName: authorName,
      content: content,
      createdAt: createdAt.toDate(),
      isEdited: isEdited,
    );
  }

  static String _text(Object? value) => value is String ? value.trim() : '';
}
