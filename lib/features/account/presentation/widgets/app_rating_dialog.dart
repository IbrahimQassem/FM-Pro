import "package:flutter/material.dart";
import "package:url_launcher/url_launcher.dart";

import "../../../../l10n/generated/app_localizations.dart";

class AppRatingDialog extends StatefulWidget {
  const AppRatingDialog({
    super.key,
    this.storeUrl = "https://hudhudfm.com/download",
  });

  final String storeUrl;

  static Future<int?> show(BuildContext context, {String? storeUrl}) {
    return showDialog<int>(
      context: context,
      builder: (_) => AppRatingDialog(
        storeUrl: storeUrl ?? "https://hudhudfm.com/download",
      ),
    );
  }

  @override
  State<AppRatingDialog> createState() => _AppRatingDialogState();
}

class _AppRatingDialogState extends State<AppRatingDialog> {
  int _selectedStars = 5;
  bool _showCommentField = false;
  final _commentController = TextEditingController();

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  String _mascotAssetForStars(int stars) {
    if (stars >= 4) {
      return "assets/images/mascot/mascot_empty_favorites.webp";
    }
    return "assets/images/mascot/mascot_avatar_default.webp";
  }

  Future<void> _openStore() async {
    final uri = Uri.parse(widget.storeUrl);
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (e) {
      debugPrint("Failed to launch store url: $e");
    }
  }

  void _submit({bool openStore = false}) {
    if (openStore) {
      _openStore();
    }
    Navigator.of(context).pop(_selectedStars);
    final strings = AppLocalizations.of(context);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(strings.rateAppThankYou),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final isHighRating = _selectedStars >= 4;

    return AlertDialog(
      scrollable: true,
      title: Text(
        strings.rateAppDialogTitle,
        textAlign: TextAlign.center,
        style: theme.textTheme.titleLarge?.copyWith(
          fontWeight: FontWeight.w800,
        ),
      ),
      content: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 400),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Image.asset(
              _mascotAssetForStars(_selectedStars),
              height: 100,
              fit: BoxFit.contain,
              excludeFromSemantics: true,
            ),
            const SizedBox(height: 12),
            Text(
              strings.rateAppDialogPrompt,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),
            FittedBox(
              fit: BoxFit.scaleDown,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: List.generate(5, (index) {
                  final starIndex = index + 1;
                  final isSelected = starIndex <= _selectedStars;
                  return IconButton(
                    key: Key("rating-star-$starIndex"),
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    constraints: const BoxConstraints(),
                    onPressed: () => setState(() {
                      _selectedStars = starIndex;
                      if (_selectedStars <= 3) {
                        _showCommentField = true;
                      }
                    }),
                    icon: Icon(
                      isSelected
                          ? Icons.star_rounded
                          : Icons.star_outline_rounded,
                      color:
                          isSelected ? Colors.amber : theme.colorScheme.outline,
                      size: 38,
                    ),
                    tooltip: "$starIndex ${strings.rateAppTitle}",
                  );
                }),
              ),
            ),
            if (!_showCommentField && isHighRating) ...[
              const SizedBox(height: 8),
              TextButton.icon(
                key: const Key("toggle-comment-field-button"),
                onPressed: () => setState(() => _showCommentField = true),
                icon: const Icon(Icons.edit_note_rounded, size: 20),
                label: Text(strings.rateAppAddComment),
              ),
            ],
            if (_showCommentField) ...[
              const SizedBox(height: 14),
              TextField(
                key: const Key("rating-feedback-input"),
                controller: _commentController,
                maxLines: 3,
                textInputAction: TextInputAction.done,
                decoration: InputDecoration(
                  hintText: strings.rateAppFeedbackHint,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
      actionsAlignment: MainAxisAlignment.center,
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(null),
          child: Text(strings.cancel),
        ),
        if (_showCommentField) ...[
          FilledButton.icon(
            key: const Key("submit-rating-button"),
            onPressed: () => _submit(openStore: false),
            icon: const Icon(Icons.send_rounded, size: 18),
            label: Text(strings.rateAppSendFeedback),
          ),
          TextButton.icon(
            key: const Key("rate-on-store-button"),
            onPressed: () => _submit(openStore: true),
            icon: const Icon(Icons.open_in_new_rounded, size: 16),
            label: Text(strings.rateAppOnStore),
          ),
        ] else ...[
          FilledButton.icon(
            key: const Key("submit-rating-button"),
            onPressed: () => _submit(openStore: isHighRating),
            icon: Icon(
              isHighRating ? Icons.storefront_rounded : Icons.send_rounded,
              size: 18,
            ),
            label: Text(
              isHighRating ? strings.rateAppOnStore : strings.rateAppSubmit,
            ),
          ),
        ],
      ],
    );
  }
}
