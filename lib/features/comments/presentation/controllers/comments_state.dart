import '../../domain/models/episode_comment.dart';
import '../../domain/repositories/comments_repository.dart';

class CommentsState {
  const CommentsState({
    this.comments = const [],
    this.isLoading = true,
    this.isSubmitting = false,
    this.loadFailed = false,
    this.submitFailure,
  });

  final List<EpisodeComment> comments;
  final bool isLoading;
  final bool isSubmitting;
  final bool loadFailed;
  final CommentFailure? submitFailure;

  CommentsState copyWith({
    List<EpisodeComment>? comments,
    bool? isLoading,
    bool? isSubmitting,
    bool? loadFailed,
    CommentFailure? submitFailure,
    bool clearSubmitFailure = false,
  }) {
    return CommentsState(
      comments: comments ?? this.comments,
      isLoading: isLoading ?? this.isLoading,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      loadFailed: loadFailed ?? this.loadFailed,
      submitFailure: clearSubmitFailure
          ? null
          : submitFailure ?? this.submitFailure,
    );
  }
}
