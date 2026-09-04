import "package:flutter/material.dart";

import "../../../../l10n/generated/app_localizations.dart";

class AppRatingDialog extends StatefulWidget {
  const AppRatingDialog({super.key});

  static Future<int?> show(BuildContext context) {
    return showDialog<int>(
      context: context,
      builder: (_) => const AppRatingDialog(),
    );
  }

  @override
  State<AppRatingDialog> createState() => _AppRatingDialogState();
}

class _AppRatingDialogState extends State<AppRatingDialog> {
  int _selectedStars = 5;

  String _mascotAssetForStars(int stars) {
    if (stars >= 4) {
      return "assets/images/mascot/mascot_empty_favorites.webp";
    }
    return "assets/images/mascot/mascot_avatar_default.webp";
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    final theme = Theme.of(context);

    return AlertDialog(
      scrollable: true,
      title: Text(
        strings.rateAppDialogTitle,
        textAlign: TextAlign.center,
        style:
            theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
      ),
      content: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 400),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Image.asset(
              _mascotAssetForStars(_selectedStars),
              height: 110,
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
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 6,
              children: List.generate(5, (index) {
                final starIndex = index + 1;
                final isSelected = starIndex <= _selectedStars;
                return IconButton(
                  key: Key("rating-star-$starIndex"),
                  onPressed: () => setState(() => _selectedStars = starIndex),
                  icon: Icon(
                    isSelected
                        ? Icons.star_rounded
                        : Icons.star_outline_rounded,
                    color:
                        isSelected ? Colors.amber : theme.colorScheme.outline,
                    size: 36,
                  ),
                  tooltip: "$starIndex ${strings.rateAppTitle}",
                );
              }),
            ),
          ],
        ),
      ),
      actionsAlignment: MainAxisAlignment.center,
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(null),
          child: Text(strings.cancel),
        ),
        FilledButton(
          key: const Key("submit-rating-button"),
          onPressed: () {
            Navigator.of(context).pop(_selectedStars);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(strings.rateAppThankYou),
                behavior: SnackBarBehavior.floating,
              ),
            );
          },
          child: Text(strings.rateAppSubmit),
        ),
      ],
    );
  }
}
