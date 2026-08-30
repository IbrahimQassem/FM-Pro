import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/models/episode_comment.dart';
import '../../domain/repositories/comments_repository.dart';
import 'comments_state.dart';

class CommentsController extends StateNotifier<CommentsState> {
  CommentsController(this.episodeId, this._repository)
    : super(const CommentsState()) {
    _subscribe();
  }

  final String episodeId;
  final CommentsRepository _repository;
  StreamSubscription<List<EpisodeComment>>? _subscription;

  void _subscribe() {
    _subscription = _repository
        .watchComments(episodeId)
        .listen(
          (comments) {
            if (mounted) {
              state = state.copyWith(
                comments: comments,
                isLoading: false,
                loadFailed: false,
              );
            }
          },
          onError: (_) {
            if (mounted) {
              state = state.copyWith(isLoading: false, loadFailed: true);
            }
          },
        );
  }

  Future<bool> submit(String content) async {
    state = state.copyWith(isSubmitting: true, clearSubmitFailure: true);
    try {
      await _repository.addComment(episodeId: episodeId, content: content);
      if (mounted) state = state.copyWith(isSubmitting: false);
      return true;
    } on CommentException catch (error) {
      if (mounted) {
        state = state.copyWith(
          isSubmitting: false,
          submitFailure: error.failure,
        );
      }
      return false;
    } on Object {
      if (mounted) {
        state = state.copyWith(
          isSubmitting: false,
          submitFailure: CommentFailure.unavailable,
        );
      }
      return false;
    }
  }

  @override
  void dispose() {
    unawaited(_subscription?.cancel());
    super.dispose();
  }
}
