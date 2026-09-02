import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/models/episode_comment.dart';
import '../../domain/repositories/comments_repository.dart';
import 'comments_state.dart';

class CommentsController extends StateNotifier<CommentsState> {
  CommentsController(this.episodeId, this._repository)
    : super(const CommentsState()) {
    _subscribe();
    unawaited(refreshTermsAcceptance());
    unawaited(refreshBlockedAuthors());
  }

  final String episodeId;
  final CommentsRepository _repository;
  StreamSubscription<List<EpisodeComment>>? _subscription;
  List<EpisodeComment> _allComments = const [];
  int _visibilityRequestGeneration = 0;

  void _subscribe() {
    _subscription = _repository
        .watchComments(episodeId)
        .listen(
          (comments) {
            if (mounted) {
              _allComments = comments;
              state = state.copyWith(
                comments: _visibleComments(state.blockedAuthorIds),
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

  Future<void> refreshBlockedAuthors() async {
    final requestGeneration = ++_visibilityRequestGeneration;
    state = state.copyWith(
      isVisibilityLoading: true,
      visibilityLoadFailed: false,
    );
    try {
      final blockedAuthorIds = await _repository.loadBlockedAuthorIds();
      if (mounted && requestGeneration == _visibilityRequestGeneration) {
        final immutableIds = Set<String>.unmodifiable(blockedAuthorIds);
        state = state.copyWith(
          blockedAuthorIds: immutableIds,
          comments: _visibleComments(immutableIds),
          isVisibilityLoading: false,
          visibilityLoadFailed: false,
        );
      }
    } on Object {
      if (mounted && requestGeneration == _visibilityRequestGeneration) {
        state = state.copyWith(
          comments: const [],
          isVisibilityLoading: false,
          visibilityLoadFailed: true,
        );
      }
    }
  }

  Future<void> refreshTermsAcceptance() async {
    state = state.copyWith(isTermsLoading: true, termsFailure: false);
    try {
      final accepted = await _repository.hasAcceptedCurrentTerms();
      if (mounted) {
        state = state.copyWith(
          isTermsLoading: false,
          hasAcceptedTerms: accepted,
          termsFailure: false,
        );
      }
    } on Object {
      if (mounted) {
        state = state.copyWith(
          isTermsLoading: false,
          hasAcceptedTerms: false,
          termsFailure: true,
        );
      }
    }
  }

  Future<bool> acceptCurrentTerms() async {
    state = state.copyWith(isAcceptingTerms: true, termsFailure: false);
    try {
      await _repository.acceptCurrentTerms();
      if (mounted) {
        state = state.copyWith(
          isAcceptingTerms: false,
          hasAcceptedTerms: true,
          termsFailure: false,
        );
      }
      return true;
    } on Object {
      if (mounted) {
        state = state.copyWith(
          isAcceptingTerms: false,
          hasAcceptedTerms: false,
          termsFailure: true,
        );
      }
      return false;
    }
  }

  Future<bool> submit(String content) async {
    if (!state.hasAcceptedTerms) {
      state = state.copyWith(
        submitFailure: CommentFailure.termsAcceptanceRequired,
      );
      return false;
    }
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

  Future<CommentModerationFailure?> reportComment({
    required EpisodeComment comment,
    required CommentReportReason reason,
    required String details,
  }) async {
    state = state.copyWith(busyModerationCommentId: comment.id);
    try {
      await _repository.reportComment(
        comment: comment,
        reason: reason,
        details: details,
      );
      return null;
    } on CommentModerationException catch (error) {
      return error.failure;
    } on Object {
      return CommentModerationFailure.unavailable;
    } finally {
      if (mounted) {
        state = state.copyWith(clearBusyModerationCommentId: true);
      }
    }
  }

  Future<CommentModerationFailure?> reportUser({
    required EpisodeComment sourceComment,
    required CommentReportReason reason,
    required String details,
  }) async {
    state = state.copyWith(busyModerationCommentId: sourceComment.id);
    try {
      await _repository.reportUser(
        sourceComment: sourceComment,
        reason: reason,
        details: details,
      );
      return null;
    } on CommentModerationException catch (error) {
      return error.failure;
    } on Object {
      return CommentModerationFailure.unavailable;
    } finally {
      if (mounted) {
        state = state.copyWith(clearBusyModerationCommentId: true);
      }
    }
  }

  Future<CommentModerationFailure?> blockAuthor(EpisodeComment comment) async {
    state = state.copyWith(busyModerationCommentId: comment.id);
    try {
      await _repository.blockAuthor(comment.authorId);
      if (mounted) {
        _visibilityRequestGeneration++;
        final blocked = Set<String>.of(state.blockedAuthorIds)
          ..add(comment.authorId);
        final immutableIds = Set<String>.unmodifiable(blocked);
        state = state.copyWith(
          blockedAuthorIds: immutableIds,
          comments: _visibleComments(immutableIds),
        );
      }
      return null;
    } on CommentModerationException catch (error) {
      return error.failure;
    } on Object {
      return CommentModerationFailure.unavailable;
    } finally {
      if (mounted) {
        state = state.copyWith(clearBusyModerationCommentId: true);
      }
    }
  }

  Future<CommentModerationFailure?> unblockAuthor(String authorId) async {
    try {
      await _repository.unblockAuthor(authorId);
      if (mounted) {
        _visibilityRequestGeneration++;
        final blocked = Set<String>.of(state.blockedAuthorIds)
          ..remove(authorId);
        final immutableIds = Set<String>.unmodifiable(blocked);
        state = state.copyWith(
          blockedAuthorIds: immutableIds,
          comments: _visibleComments(immutableIds),
        );
      }
      return null;
    } on CommentModerationException catch (error) {
      return error.failure;
    } on Object {
      return CommentModerationFailure.unavailable;
    }
  }

  List<EpisodeComment> _visibleComments(Set<String> blockedAuthorIds) {
    return List<EpisodeComment>.unmodifiable(
      _allComments.where(
        (comment) => !blockedAuthorIds.contains(comment.authorId),
      ),
    );
  }

  @override
  void dispose() {
    unawaited(_subscription?.cancel());
    super.dispose();
  }
}
