import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../app/providers.dart';
import '../../../core/widgets/mascot_avatar.dart';
import '../../../core/widgets/mascot_feedback_view.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../../account/presentation/account_screen.dart';
import '../../station_content/domain/models/episode.dart';
import '../domain/models/episode_comment.dart';
import '../domain/repositories/comments_repository.dart';

class EpisodeCommentsScreen extends ConsumerStatefulWidget {
  const EpisodeCommentsScreen({required this.episode, super.key});

  final Episode episode;

  @override
  ConsumerState<EpisodeCommentsScreen> createState() =>
      _EpisodeCommentsScreenState();
}

class _EpisodeCommentsScreenState extends ConsumerState<EpisodeCommentsScreen> {
  final _commentController = TextEditingController();

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    final state = ref.watch(commentsControllerProvider(widget.episode.id));
    final commentsController = ref.read(
      commentsControllerProvider(widget.episode.id).notifier,
    );
    final account = ref.watch(accountControllerProvider);
    final canInteract = account.user?.emailVerified == true;
    ref.listen<String?>(
      accountControllerProvider.select((value) {
        final user = value.user;
        return user == null ? null : '${user.uid}:${user.emailVerified}';
      }),
      (previous, next) {
        if (previous != next) {
          unawaited(commentsController.refreshTermsAcceptance());
          unawaited(commentsController.refreshBlockedAuthors());
        }
      },
    );

    return Scaffold(
      appBar: AppBar(
        title: Text(strings.episodeComments(widget.episode.title)),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: state.isLoading || state.isVisibilityLoading
                  ? const Center(child: CircularProgressIndicator())
                  : state.loadFailed || state.visibilityLoadFailed
                  ? _RetryMessageState(
                      icon: Icons.cloud_off_rounded,
                      title: state.visibilityLoadFailed
                          ? strings.moderationPreferencesLoadError
                          : strings.commentsLoadError,
                      onRetry: state.visibilityLoadFailed
                          ? commentsController.refreshBlockedAuthors
                          : null,
                    )
                  : state.comments.isEmpty
                  ? MascotFeedbackView(
                      imageAsset:
                          'assets/images/mascot/mascot_empty_comments.webp',
                      title: strings.mascotEmptyCommentsTitle,
                      subtitle: strings.mascotEmptyCommentsSubtitle,
                      imageHeight: 140,
                    )
                  : ListView.separated(
                      reverse: false,
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
                      itemCount: state.comments.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final comment = state.comments[index];
                        return _CommentCard(
                          comment: comment,
                          showActions: account.user?.uid != comment.authorId,
                          isBusy: state.busyModerationCommentId == comment.id,
                          onReport: () =>
                              _reportComment(comment, canInteract: canInteract),
                          onReportUser: () =>
                              _reportUser(comment, canInteract: canInteract),
                          onBlock: () =>
                              _blockAuthor(comment, canInteract: canInteract),
                        );
                      },
                    ),
            ),
            if (account.isInitializing)
              const LinearProgressIndicator()
            else if (canInteract)
              state.isTermsLoading
                  ? const LinearProgressIndicator()
                  : state.hasAcceptedTerms
                  ? _Composer(
                      controller: _commentController,
                      isSubmitting: state.isSubmitting,
                      errorText: _commentFailureText(
                        strings,
                        state.submitFailure,
                      ),
                      onSubmit: _submit,
                      onReviewTerms: () => _showTerms(allowAcceptance: false),
                    )
                  : _TermsGate(
                      isAccepting: state.isAcceptingTerms,
                      hasFailure: state.termsFailure,
                      onReviewAndAccept: () =>
                          _showTerms(allowAcceptance: true),
                      onRetry: commentsController.refreshTermsAcceptance,
                    )
            else
              Material(
                elevation: 6,
                color: Theme.of(context).colorScheme.surface,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      key: const Key('comments-sign-in'),
                      onPressed: () async {
                        await Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => const AccountScreen(),
                          ),
                        );
                      },
                      icon: const Icon(Icons.login_rounded),
                      label: Text(
                        account.isSignedIn
                            ? strings.verifyEmailToComment
                            : strings.signInToComment,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _submit() async {
    final succeeded = await ref
        .read(commentsControllerProvider(widget.episode.id).notifier)
        .submit(_commentController.text);
    if (succeeded) _commentController.clear();
  }

  Future<void> _showTerms({required bool allowAcceptance}) async {
    final accepted = await showDialog<bool>(
      context: context,
      builder: (context) => _UgcTermsDialog(allowAcceptance: allowAcceptance),
    );
    if (accepted != true || !mounted) return;
    await ref
        .read(commentsControllerProvider(widget.episode.id).notifier)
        .acceptCurrentTerms();
  }

  Future<bool> _ensureVerifiedAccount(bool canInteract) async {
    if (canInteract) return true;
    await Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => const AccountScreen()));
    return false;
  }

  Future<void> _reportComment(
    EpisodeComment comment, {
    required bool canInteract,
  }) async {
    if (!await _ensureVerifiedAccount(canInteract) || !mounted) return;
    final request = await showDialog<_ReportRequest>(
      context: context,
      builder: (_) => const _ReportDialog(target: _ReportTarget.comment),
    );
    if (request == null || !mounted) return;
    final failure = await ref
        .read(commentsControllerProvider(widget.episode.id).notifier)
        .reportComment(
          comment: comment,
          reason: request.reason,
          details: request.details,
        );
    if (!mounted) return;
    _showFeedback(
      failure == null
          ? AppLocalizations.of(context).commentReportSubmitted
          : _moderationFailureText(
              AppLocalizations.of(context),
              failure,
              alreadyReportedText: AppLocalizations.of(
                context,
              ).commentAlreadyReported,
            ),
    );
  }

  Future<void> _reportUser(
    EpisodeComment sourceComment, {
    required bool canInteract,
  }) async {
    if (!await _ensureVerifiedAccount(canInteract) || !mounted) return;
    final request = await showDialog<_ReportRequest>(
      context: context,
      builder: (_) => const _ReportDialog(target: _ReportTarget.user),
    );
    if (request == null || !mounted) return;
    final failure = await ref
        .read(commentsControllerProvider(widget.episode.id).notifier)
        .reportUser(
          sourceComment: sourceComment,
          reason: request.reason,
          details: request.details,
        );
    if (!mounted) return;
    final strings = AppLocalizations.of(context);
    _showFeedback(
      failure == null
          ? strings.userReportSubmitted
          : _moderationFailureText(
              strings,
              failure,
              alreadyReportedText: strings.userAlreadyReported,
            ),
    );
  }

  Future<void> _blockAuthor(
    EpisodeComment comment, {
    required bool canInteract,
  }) async {
    if (!await _ensureVerifiedAccount(canInteract) || !mounted) return;
    final strings = AppLocalizations.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(strings.blockUserTitle),
        content: Text(strings.blockUserConfirmation(comment.authorName)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(strings.cancel),
          ),
          FilledButton(
            key: const Key('confirm-block-user'),
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(strings.blockUser),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    final controller = ref.read(
      commentsControllerProvider(widget.episode.id).notifier,
    );
    final failure = await controller.blockAuthor(comment);
    if (!mounted) return;
    if (failure != null) {
      _showFeedback(_moderationFailureText(strings, failure));
      return;
    }
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(strings.userBlocked(comment.authorName)),
          action: SnackBarAction(
            label: strings.undo,
            onPressed: () async {
              final undoFailure = await controller.unblockAuthor(
                comment.authorId,
              );
              if (undoFailure != null && mounted) {
                _showFeedback(_moderationFailureText(strings, undoFailure));
              }
            },
          ),
        ),
      );
  }

  void _showFeedback(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  String _moderationFailureText(
    AppLocalizations strings,
    CommentModerationFailure failure, {
    String? alreadyReportedText,
  }) {
    return switch (failure) {
      CommentModerationFailure.authenticationRequired =>
        strings.signInForCommentSafetyActions,
      CommentModerationFailure.invalid => strings.commentSafetyInvalid,
      CommentModerationFailure.alreadyReported =>
        alreadyReportedText ?? strings.commentAlreadyReported,
      CommentModerationFailure.unavailable => strings.commentSafetyError,
    };
  }

  String? _commentFailureText(
    AppLocalizations strings,
    CommentFailure? failure,
  ) {
    return switch (failure) {
      null => null,
      CommentFailure.authenticationRequired => strings.signInToComment,
      CommentFailure.termsAcceptanceRequired => strings.ugcTermsRequired,
      CommentFailure.invalid => strings.commentValidation,
      CommentFailure.unavailable => strings.commentSubmitError,
    };
  }
}

class _CommentCard extends StatelessWidget {
  const _CommentCard({
    required this.comment,
    required this.showActions,
    required this.isBusy,
    required this.onReport,
    required this.onReportUser,
    required this.onBlock,
  });

  final EpisodeComment comment;
  final bool showActions;
  final bool isBusy;
  final VoidCallback onReport;
  final VoidCallback onReportUser;
  final VoidCallback onBlock;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context).toLanguageTag();
    final timestamp = DateFormat.yMMMd(
      locale,
    ).add_Hm().format(comment.createdAt);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const MascotAvatar(
                  radius: 18,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    comment.authorName,
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
                Flexible(
                  child: Text(
                    timestamp,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
                if (showActions)
                  isBusy
                      ? const Padding(
                          padding: EdgeInsets.all(12),
                          child: SizedBox.square(
                            dimension: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        )
                      : PopupMenuButton<_CommentAction>(
                          key: Key('comment-actions-${comment.id}'),
                          tooltip: strings.commentSafetyActions,
                          onSelected: (action) {
                            switch (action) {
                              case _CommentAction.report:
                                onReport();
                              case _CommentAction.reportUser:
                                onReportUser();
                              case _CommentAction.block:
                                onBlock();
                            }
                          },
                          itemBuilder: (context) => [
                            PopupMenuItem(
                              value: _CommentAction.report,
                              child: Row(
                                children: [
                                  const Icon(Icons.flag_outlined),
                                  const SizedBox(width: 12),
                                  Flexible(child: Text(strings.reportComment)),
                                ],
                              ),
                            ),
                            PopupMenuItem(
                              value: _CommentAction.reportUser,
                              child: Row(
                                children: [
                                  const Icon(Icons.person_off_outlined),
                                  const SizedBox(width: 12),
                                  Flexible(child: Text(strings.reportUser)),
                                ],
                              ),
                            ),
                            PopupMenuItem(
                              value: _CommentAction.block,
                              child: Row(
                                children: [
                                  const Icon(Icons.block_rounded),
                                  const SizedBox(width: 12),
                                  Flexible(child: Text(strings.blockUser)),
                                ],
                              ),
                            ),
                          ],
                        ),
              ],
            ),
            const SizedBox(height: 10),
            Text(comment.content),
            if (comment.isEdited) ...[
              const SizedBox(height: 5),
              Text(
                strings.editedComment,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

enum _CommentAction { report, reportUser, block }

class _Composer extends StatelessWidget {
  const _Composer({
    required this.controller,
    required this.isSubmitting,
    required this.onSubmit,
    required this.onReviewTerms,
    this.errorText,
  });

  final TextEditingController controller;
  final bool isSubmitting;
  final VoidCallback onSubmit;
  final VoidCallback onReviewTerms;
  final String? errorText;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    return Material(
      elevation: 8,
      color: Theme.of(context).colorScheme.surface,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: TextField(
                    key: const Key('comment-input'),
                    controller: controller,
                    enabled: !isSubmitting,
                    minLines: 1,
                    maxLines: 4,
                    maxLength: 1000,
                    textInputAction: TextInputAction.newline,
                    decoration: InputDecoration(
                      hintText: strings.writeComment,
                      counterText: '',
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  key: const Key('comment-submit'),
                  onPressed: isSubmitting ? null : onSubmit,
                  tooltip: strings.sendComment,
                  icon: isSubmitting
                      ? const SizedBox.square(
                          dimension: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.send_rounded),
                ),
              ],
            ),
            if (errorText != null)
              Semantics(
                liveRegion: true,
                child: Text(
                  errorText!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton.icon(
                key: const Key('comments-review-ugc-terms'),
                onPressed: isSubmitting ? null : onReviewTerms,
                icon: const Icon(Icons.policy_outlined),
                label: Text(strings.ugcReviewTerms),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TermsGate extends StatelessWidget {
  const _TermsGate({
    required this.isAccepting,
    required this.hasFailure,
    required this.onReviewAndAccept,
    required this.onRetry,
  });

  final bool isAccepting;
  final bool hasFailure;
  final VoidCallback onReviewAndAccept;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    return Material(
      elevation: 8,
      color: Theme.of(context).colorScheme.surface,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              strings.ugcTermsGateTitle,
              style: Theme.of(
                context,
              ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 4),
            Text(strings.ugcTermsGateMessage),
            if (hasFailure) ...[
              const SizedBox(height: 8),
              Semantics(
                liveRegion: true,
                child: Text(
                  strings.ugcTermsSaveError,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: TextButton(
                  onPressed: isAccepting ? null : onRetry,
                  child: Text(strings.retryTerms),
                ),
              ),
            ],
            const SizedBox(height: 10),
            FilledButton.icon(
              key: const Key('comments-open-ugc-terms'),
              onPressed: isAccepting ? null : onReviewAndAccept,
              icon: isAccepting
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.policy_outlined),
              label: Text(strings.ugcReviewTerms),
            ),
          ],
        ),
      ),
    );
  }
}

class _UgcTermsDialog extends StatelessWidget {
  const _UgcTermsDialog({required this.allowAcceptance});

  final bool allowAcceptance;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    final rules = [
      strings.ugcTermsRespectRule,
      strings.ugcTermsSafetyRule,
      strings.ugcTermsPrivacyRule,
      strings.ugcTermsSpamRule,
    ];
    return AlertDialog(
      scrollable: true,
      title: Text(strings.ugcTermsTitle),
      content: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 520),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Image.asset(
                'assets/images/mascot/mascot_ugc_guidelines.webp',
                height: 84,
                fit: BoxFit.contain,
              ),
            ),
            const SizedBox(height: 10),
            Center(
              child: Text(
                strings.mascotUgcGuidelinesBadge,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: Theme.of(context).colorScheme.primary,
                    ),
              ),
            ),
            const SizedBox(height: 12),
            Text(strings.ugcTermsIntro),
            const SizedBox(height: 14),
            for (final rule in rules)
              Padding(
                padding: const EdgeInsetsDirectional.only(bottom: 10),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Padding(
                      padding: EdgeInsetsDirectional.only(top: 7),
                      child: Icon(Icons.circle, size: 7),
                    ),
                    const SizedBox(width: 10),
                    Expanded(child: Text(rule)),
                  ],
                ),
              ),
            const SizedBox(height: 4),
            Text(
              strings.ugcTermsModerationNotice,
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
          ],
        ),
      ),
      actions: allowAcceptance
          ? [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: Text(strings.cancel),
              ),
              FilledButton(
                key: const Key('comments-accept-ugc-terms'),
                onPressed: () => Navigator.of(context).pop(true),
                child: Text(strings.ugcAcceptAndContinue),
              ),
            ]
          : [
              FilledButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: Text(strings.close),
              ),
            ],
    );
  }
}

class _ReportRequest {
  const _ReportRequest({required this.reason, required this.details});

  final CommentReportReason reason;
  final String details;
}

enum _ReportTarget { comment, user }

class _ReportDialog extends StatefulWidget {
  const _ReportDialog({required this.target});

  final _ReportTarget target;

  @override
  State<_ReportDialog> createState() => _ReportDialogState();
}

class _ReportDialogState extends State<_ReportDialog> {
  final _detailsController = TextEditingController();
  CommentReportReason _reason = CommentReportReason.harassment;

  @override
  void dispose() {
    _detailsController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    return AlertDialog(
      scrollable: true,
      title: Text(
        widget.target == _ReportTarget.comment
            ? strings.reportCommentTitle
            : strings.reportUserTitle,
      ),
      content: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 520),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              widget.target == _ReportTarget.comment
                  ? strings.reportCommentPrivacyNotice
                  : strings.reportUserPrivacyNotice,
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<CommentReportReason>(
              key: const Key('comment-report-reason'),
              initialValue: _reason,
              isExpanded: true,
              decoration: InputDecoration(labelText: strings.reportReason),
              items: CommentReportReason.values
                  .map(
                    (reason) => DropdownMenuItem(
                      value: reason,
                      child: Text(
                        _reportReasonText(strings, reason),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  )
                  .toList(growable: false),
              onChanged: (reason) {
                if (reason != null) setState(() => _reason = reason);
              },
            ),
            const SizedBox(height: 14),
            TextField(
              key: const Key('comment-report-details'),
              controller: _detailsController,
              minLines: 2,
              maxLines: 4,
              maxLength: 500,
              decoration: InputDecoration(
                labelText: strings.reportDetailsOptional,
                hintText: strings.reportDetailsHint,
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text(strings.cancel),
        ),
        FilledButton(
          key: const Key('submit-comment-report'),
          onPressed: () => Navigator.of(context).pop(
            _ReportRequest(reason: _reason, details: _detailsController.text),
          ),
          child: Text(strings.submitReport),
        ),
      ],
    );
  }

  String _reportReasonText(
    AppLocalizations strings,
    CommentReportReason reason,
  ) {
    return switch (reason) {
      CommentReportReason.harassment => strings.reportReasonHarassment,
      CommentReportReason.hate => strings.reportReasonHate,
      CommentReportReason.sexualContent => strings.reportReasonSexual,
      CommentReportReason.violence => strings.reportReasonViolence,
      CommentReportReason.spam => strings.reportReasonSpam,
      CommentReportReason.privacy => strings.reportReasonPrivacy,
      CommentReportReason.other => strings.reportReasonOther,
    };
  }
}

class _RetryMessageState extends StatelessWidget {
  const _RetryMessageState({
    required this.icon,
    required this.title,
    this.onRetry,
  });

  final IconData icon;
  final String title;
  final Future<void> Function()? onRetry;

  @override
  Widget build(BuildContext context) {
    final retry = onRetry;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 52),
            const SizedBox(height: 12),
            Text(title, textAlign: TextAlign.center),
            if (retry != null) ...[
              const SizedBox(height: 12),
              FilledButton.tonal(
                onPressed: retry,
                child: Text(AppLocalizations.of(context).retry),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

