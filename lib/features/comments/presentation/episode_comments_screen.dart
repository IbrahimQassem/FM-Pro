import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../app/providers.dart';
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
    final account = ref.watch(accountControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(strings.episodeComments(widget.episode.title)),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: state.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : state.loadFailed
                  ? _MessageState(
                      icon: Icons.cloud_off_rounded,
                      title: strings.commentsLoadError,
                    )
                  : state.comments.isEmpty
                  ? _MessageState(
                      icon: Icons.chat_bubble_outline_rounded,
                      title: strings.noCommentsYet,
                    )
                  : ListView.separated(
                      reverse: false,
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
                      itemCount: state.comments.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 10),
                      itemBuilder: (context, index) =>
                          _CommentCard(comment: state.comments[index]),
                    ),
            ),
            if (account.isInitializing)
              const LinearProgressIndicator()
            else if (account.isSignedIn)
              _Composer(
                controller: _commentController,
                isSubmitting: state.isSubmitting,
                errorText: _commentFailureText(strings, state.submitFailure),
                onSubmit: _submit,
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
                      label: Text(strings.signInToComment),
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

  String? _commentFailureText(
    AppLocalizations strings,
    CommentFailure? failure,
  ) {
    return switch (failure) {
      null => null,
      CommentFailure.authenticationRequired => strings.signInToComment,
      CommentFailure.invalid => strings.commentValidation,
      CommentFailure.unavailable => strings.commentSubmitError,
    };
  }
}

class _CommentCard extends StatelessWidget {
  const _CommentCard({required this.comment});

  final EpisodeComment comment;

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
                CircleAvatar(
                  radius: 18,
                  child: Text(comment.authorName.characters.first),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    comment.authorName,
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
                Text(
                  timestamp,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
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

class _Composer extends StatelessWidget {
  const _Composer({
    required this.controller,
    required this.isSubmitting,
    required this.onSubmit,
    this.errorText,
  });

  final TextEditingController controller;
  final bool isSubmitting;
  final VoidCallback onSubmit;
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
          ],
        ),
      ),
    );
  }
}

class _MessageState extends StatelessWidget {
  const _MessageState({required this.icon, required this.title});

  final IconData icon;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 52),
            const SizedBox(height: 12),
            Text(title, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
