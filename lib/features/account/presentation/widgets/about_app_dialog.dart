import "package:flutter/material.dart";

import "../../../../l10n/generated/app_localizations.dart";

class AboutAppDialog extends StatelessWidget {
  const AboutAppDialog({super.key});

  static Future<void> show(BuildContext context) {
    return showDialog<void>(
      context: context,
      builder: (_) => const AboutAppDialog(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final currentYear = DateTime.now().year.toString();

    return AlertDialog(
      scrollable: true,
      title: Column(
        children: [
          Image.asset(
            "assets/images/mascot/mascot_onboarding.webp",
            height: 90,
            fit: BoxFit.contain,
            excludeFromSemantics: true,
          ),
          const SizedBox(height: 8),
          Text(
            strings.aboutAppTitle,
            style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 2),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
            decoration: BoxDecoration(
              color: theme.colorScheme.primaryContainer,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              "${strings.appVersionLabel} 1.0.0 (1)",
              style: theme.textTheme.labelMedium?.copyWith(
                color: theme.colorScheme.onPrimaryContainer,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
      content: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 450),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              strings.aboutAppDescription,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(height: 1.5),
            ),
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                TextButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(strings.privacyPolicy)),
                    );
                  },
                  child: Text(strings.privacyPolicy),
                ),
                const Text(" • "),
                TextButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(strings.termsOfService)),
                    );
                  },
                  child: Text(strings.termsOfService),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              strings.allRightsReserved(currentYear),
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.outline,
              ),
            ),
          ],
        ),
      ),
      actionsAlignment: MainAxisAlignment.center,
      actions: [
        FilledButton.tonal(
          key: const Key("close-about-dialog"),
          onPressed: () => Navigator.of(context).pop(),
          child: Text(strings.cancel),
        ),
      ],
    );
  }
}
