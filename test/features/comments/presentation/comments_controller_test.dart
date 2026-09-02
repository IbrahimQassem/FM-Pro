import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/comments/domain/models/episode_comment.dart';
import 'package:hudhud_fm/features/comments/domain/repositories/comments_repository.dart';
import 'package:hudhud_fm/features/comments/presentation/controllers/comments_controller.dart';

void main() {
  test('owns realtime comments and submits canonical content', () async {
    final repository = _FakeCommentsRepository();
    final controller = CommentsController('episode-1', repository);
    addTearDown(controller.dispose);
    addTearDown(repository.dispose);

    repository.emit([_comment]);
    await Future<void>.delayed(Duration.zero);
    expect(controller.state.comments.single.id, 'comment-1');
    expect(controller.state.isLoading, isFalse);

    final succeeded = await controller.submit('  Great episode  ');
    expect(succeeded, isTrue);
    expect(repository.submittedEpisodeId, 'episode-1');
    expect(repository.submittedContent, '  Great episode  ');
  });

  test('surfaces authentication failure without throwing into UI', () async {
    final repository = _FakeCommentsRepository(
      submitFailure: CommentFailure.authenticationRequired,
    );
    final controller = CommentsController('episode-1', repository);
    addTearDown(controller.dispose);
    addTearDown(repository.dispose);

    await Future<void>.delayed(Duration.zero);
    expect(await controller.submit('Comment'), isFalse);
    expect(
      controller.state.submitFailure,
      CommentFailure.authenticationRequired,
    );
  });

  test(
    'requires current UGC terms before submitting and accepts them',
    () async {
      final repository = _FakeCommentsRepository(hasAcceptedTerms: false);
      final controller = CommentsController('episode-1', repository);
      addTearDown(controller.dispose);
      addTearDown(repository.dispose);

      await Future<void>.delayed(Duration.zero);
      expect(controller.state.hasAcceptedTerms, isFalse);
      expect(await controller.submit('Comment'), isFalse);
      expect(
        controller.state.submitFailure,
        CommentFailure.termsAcceptanceRequired,
      );
      expect(repository.submittedContent, isNull);

      expect(await controller.acceptCurrentTerms(), isTrue);
      expect(controller.state.hasAcceptedTerms, isTrue);
      expect(repository.didAcceptTerms, isTrue);
      expect(await controller.submit('Comment'), isTrue);
    },
  );

  test('filters blocked authors and supports block undo', () async {
    final repository = _FakeCommentsRepository(blockedAuthorIds: {'user-2'});
    final controller = CommentsController('episode-1', repository);
    addTearDown(controller.dispose);
    addTearDown(repository.dispose);

    repository.emit([_comment, _secondComment]);
    await Future<void>.delayed(Duration.zero);
    expect(controller.state.comments.map((item) => item.authorId), ['user-1']);

    expect(await controller.blockAuthor(_comment), isNull);
    expect(controller.state.comments, isEmpty);
    expect(repository.blockedAuthorIds, {'user-1', 'user-2'});

    expect(await controller.unblockAuthor('user-1'), isNull);
    expect(controller.state.comments.map((item) => item.authorId), ['user-1']);
  });

  test('submits a canonical report and exposes duplicate failure', () async {
    final repository = _FakeCommentsRepository();
    final controller = CommentsController('episode-1', repository);
    addTearDown(controller.dispose);
    addTearDown(repository.dispose);
    await Future<void>.delayed(Duration.zero);

    expect(
      await controller.reportComment(
        comment: _comment,
        reason: CommentReportReason.spam,
        details: '  repeated links  ',
      ),
      isNull,
    );
    expect(repository.reportedComment?.id, 'comment-1');
    expect(repository.reportReason, CommentReportReason.spam);

    expect(
      await controller.reportUser(
        sourceComment: _secondComment,
        reason: CommentReportReason.harassment,
        details: 'account behavior',
      ),
      isNull,
    );
    expect(repository.reportedUserId, 'user-2');

    repository.moderationFailure = CommentModerationFailure.alreadyReported;
    expect(
      await controller.reportComment(
        comment: _comment,
        reason: CommentReportReason.spam,
        details: '',
      ),
      CommentModerationFailure.alreadyReported,
    );
  });
}

final _comment = EpisodeComment(
  id: 'comment-1',
  episodeId: 'episode-1',
  authorId: 'user-1',
  authorName: 'Listener',
  content: 'Useful',
  createdAt: DateTime.utc(2026, 8, 30),
  isEdited: false,
);

final _secondComment = EpisodeComment(
  id: 'comment-2',
  episodeId: 'episode-1',
  authorId: 'user-2',
  authorName: 'Other listener',
  content: 'Another comment',
  createdAt: DateTime.utc(2026, 8, 30),
  isEdited: false,
);

class _FakeCommentsRepository implements CommentsRepository {
  _FakeCommentsRepository({
    this.submitFailure,
    this.hasAcceptedTerms = true,
    Set<String>? blockedAuthorIds,
  }) : blockedAuthorIds = blockedAuthorIds ?? <String>{};

  final CommentFailure? submitFailure;
  bool hasAcceptedTerms;
  bool didAcceptTerms = false;
  final Set<String> blockedAuthorIds;
  CommentModerationFailure? moderationFailure;
  EpisodeComment? reportedComment;
  CommentReportReason? reportReason;
  String? reportedUserId;
  final _controller = StreamController<List<EpisodeComment>>.broadcast();
  String? submittedEpisodeId;
  String? submittedContent;

  void emit(List<EpisodeComment> comments) => _controller.add(comments);

  @override
  Stream<List<EpisodeComment>> watchComments(String episodeId) =>
      _controller.stream;

  @override
  Future<bool> hasAcceptedCurrentTerms() async => hasAcceptedTerms;

  @override
  Future<void> acceptCurrentTerms() async {
    didAcceptTerms = true;
    hasAcceptedTerms = true;
  }

  @override
  Future<Set<String>> loadBlockedAuthorIds() async =>
      Set<String>.of(blockedAuthorIds);

  @override
  Future<void> addComment({
    required String episodeId,
    required String content,
  }) async {
    final failure = submitFailure;
    if (failure != null) throw CommentException(failure);
    submittedEpisodeId = episodeId;
    submittedContent = content;
  }

  @override
  Future<void> reportComment({
    required EpisodeComment comment,
    required CommentReportReason reason,
    required String details,
  }) async {
    final failure = moderationFailure;
    if (failure != null) throw CommentModerationException(failure);
    reportedComment = comment;
    reportReason = reason;
  }

  @override
  Future<void> reportUser({
    required EpisodeComment sourceComment,
    required CommentReportReason reason,
    required String details,
  }) async {
    final failure = moderationFailure;
    if (failure != null) throw CommentModerationException(failure);
    reportedUserId = sourceComment.authorId;
    reportReason = reason;
  }

  @override
  Future<void> blockAuthor(String authorId) async {
    final failure = moderationFailure;
    if (failure != null) throw CommentModerationException(failure);
    blockedAuthorIds.add(authorId);
  }

  @override
  Future<void> unblockAuthor(String authorId) async {
    final failure = moderationFailure;
    if (failure != null) throw CommentModerationException(failure);
    blockedAuthorIds.remove(authorId);
  }

  Future<void> dispose() => _controller.close();
}
