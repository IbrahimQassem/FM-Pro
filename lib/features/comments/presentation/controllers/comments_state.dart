import '../../domain/models/episode_comment.dart';
import '../../domain/repositories/comments_repository.dart';

class CommentsState {
  const CommentsState({
    this.comments = const [],
    this.isLoading = true,
    this.isSubmitting = false,
    this.loadFailed = false,
    this.submitFailure,
    this.isTermsLoading = true,
    this.isAcceptingTerms = false,
    this.hasAcceptedTerms = false,
    this.termsFailure = false,
    this.blockedAuthorIds = const {},
    this.isVisibilityLoading = true,
    this.visibilityLoadFailed = false,
    this.busyModerationCommentId,
  });

  final List<EpisodeComment> comments;
  final bool isLoading;
  final bool isSubmitting;
  final bool loadFailed;
  final CommentFailure? submitFailure;
  final bool isTermsLoading;
  final bool isAcceptingTerms;
  final bool hasAcceptedTerms;
  final bool termsFailure;
  final Set<String> blockedAuthorIds;
  final bool isVisibilityLoading;
  final bool visibilityLoadFailed;
  final String? busyModerationCommentId;

  CommentsState copyWith({
    List<EpisodeComment>? comments,
    bool? isLoading,
    bool? isSubmitting,
    bool? loadFailed,
    CommentFailure? submitFailure,
    bool clearSubmitFailure = false,
    bool? isTermsLoading,
    bool? isAcceptingTerms,
    bool? hasAcceptedTerms,
    bool? termsFailure,
    Set<String>? blockedAuthorIds,
    bool? isVisibilityLoading,
    bool? visibilityLoadFailed,
    String? busyModerationCommentId,
    bool clearBusyModerationCommentId = false,
  }) {
    return CommentsState(
      comments: comments ?? this.comments,
      isLoading: isLoading ?? this.isLoading,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      loadFailed: loadFailed ?? this.loadFailed,
      submitFailure: clearSubmitFailure
          ? null
          : submitFailure ?? this.submitFailure,
      isTermsLoading: isTermsLoading ?? this.isTermsLoading,
      isAcceptingTerms: isAcceptingTerms ?? this.isAcceptingTerms,
      hasAcceptedTerms: hasAcceptedTerms ?? this.hasAcceptedTerms,
      termsFailure: termsFailure ?? this.termsFailure,
      blockedAuthorIds: blockedAuthorIds ?? this.blockedAuthorIds,
      isVisibilityLoading: isVisibilityLoading ?? this.isVisibilityLoading,
      visibilityLoadFailed: visibilityLoadFailed ?? this.visibilityLoadFailed,
      busyModerationCommentId: clearBusyModerationCommentId
          ? null
          : busyModerationCommentId ?? this.busyModerationCommentId,
    );
  }
}
