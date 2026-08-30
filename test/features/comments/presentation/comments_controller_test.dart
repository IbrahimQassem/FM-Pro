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

    expect(await controller.submit('Comment'), isFalse);
    expect(
      controller.state.submitFailure,
      CommentFailure.authenticationRequired,
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

class _FakeCommentsRepository implements CommentsRepository {
  _FakeCommentsRepository({this.submitFailure});

  final CommentFailure? submitFailure;
  final _controller = StreamController<List<EpisodeComment>>.broadcast();
  String? submittedEpisodeId;
  String? submittedContent;

  void emit(List<EpisodeComment> comments) => _controller.add(comments);

  @override
  Stream<List<EpisodeComment>> watchComments(String episodeId) =>
      _controller.stream;

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

  Future<void> dispose() => _controller.close();
}
