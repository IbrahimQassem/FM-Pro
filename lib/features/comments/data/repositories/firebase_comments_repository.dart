import 'package:cloud_firestore/cloud_firestore.dart';

import '../../domain/models/episode_comment.dart';
import '../../domain/repositories/comments_repository.dart';
import '../datasources/comments_firestore_data_source.dart';

class FirebaseCommentsRepository implements CommentsRepository {
  const FirebaseCommentsRepository(this._dataSource);

  final CommentsFirestoreDataSource _dataSource;

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
    } on CommentProfileUnavailableException {
      throw const CommentException(CommentFailure.unavailable);
    } on FirebaseException {
      throw const CommentException(CommentFailure.unavailable);
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
    if (document.id.isEmpty ||
        episodeId.isEmpty ||
        authorId.isEmpty ||
        authorName.isEmpty ||
        content.isEmpty ||
        content.length > 1000 ||
        createdAt is! Timestamp ||
        isEdited is! bool) {
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
