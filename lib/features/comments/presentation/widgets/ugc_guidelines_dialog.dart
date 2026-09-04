import "package:flutter/material.dart";

import "../../../../l10n/generated/app_localizations.dart";

class UgcGuidelinesDialog extends StatelessWidget {
  const UgcGuidelinesDialog({
    this.allowAcceptance = false,
    super.key,
  });

  final bool allowAcceptance;

  static Future<bool?> show(
    BuildContext context, {
    bool allowAcceptance = false,
  }) {
    return showDialog<bool>(
      context: context,
      builder: (context) => UgcGuidelinesDialog(allowAcceptance: allowAcceptance),
    );
  }

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
                "assets/images/mascot/mascot_ugc_guidelines.webp",
                height: 96,
                fit: BoxFit.contain,
              ),
            ),
            const SizedBox(height: 12),
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
            const SizedBox(height: 6),
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
                key: const Key("comments-accept-ugc-terms"),
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
