import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/config/app_config.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../domain/models/app_update_info.dart';

class OptionalUpdateDialog extends StatelessWidget {
  const OptionalUpdateDialog({
    required this.updateInfo,
    required this.onDismiss,
    super.key,
  });

  final AppUpdateInfo updateInfo;
  final VoidCallback onDismiss;

  static Future<void> show({
    required BuildContext context,
    required AppUpdateInfo updateInfo,
    required VoidCallback onDismiss,
  }) {
    return showDialog<void>(
      context: context,
      barrierDismissible: true,
      builder: (_) => OptionalUpdateDialog(
        updateInfo: updateInfo,
        onDismiss: onDismiss,
      ),
    );
  }

  Future<void> _openStore(BuildContext context) async {
    final isIos = !kIsWeb && defaultTargetPlatform == TargetPlatform.iOS;
    final primaryUrl = isIos
        ? (updateInfo.storeUrlIos ?? AppConfig.appStoreUrl)
        : (updateInfo.storeUrlAndroid ?? AppConfig.playStoreMarketUrl);
    final fallbackUrl = isIos
        ? (updateInfo.storeUrlIos ?? AppConfig.appStoreUrl)
        : AppConfig.playStoreWebUrl;

    try {
      final launched = await launchUrl(
        Uri.parse(primaryUrl),
        mode: LaunchMode.externalApplication,
      );
      if (!launched) {
        await launchUrl(
          Uri.parse(fallbackUrl),
          mode: LaunchMode.externalApplication,
        );
      }
    } catch (_) {
      try {
        await launchUrl(
          Uri.parse(fallbackUrl),
          mode: LaunchMode.externalApplication,
        );
      } catch (e) {
        debugPrint('OptionalUpdateDialog: Could not launch store url: $e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final isArabic = Localizations.localeOf(context).languageCode == 'ar';

    final title = (isArabic
            ? updateInfo.optionalUpdateTitleAr
            : updateInfo.optionalUpdateTitleEn) ??
        strings.optionalUpdateTitle;

    final message = (isArabic
            ? updateInfo.optionalUpdateMessageAr
            : updateInfo.optionalUpdateMessageEn) ??
        strings.optionalUpdateMessage;

    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      title: Column(
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: colors.primaryContainer.withValues(alpha: 0.4),
              shape: BoxShape.circle,
            ),
            padding: const EdgeInsets.all(12),
            child: Icon(
              Icons.system_update_rounded,
              size: 38,
              color: colors.primary,
            ),
          ),
          const SizedBox(height: 14),
          Text(
            title,
            textAlign: TextAlign.center,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
            decoration: BoxDecoration(
              color: colors.primary.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              '${strings.appVersionLabel} ${updateInfo.latestVersionName}',
              style: theme.textTheme.labelMedium?.copyWith(
                color: colors.primary,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
      content: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 380),
        child: Text(
          message,
          textAlign: TextAlign.center,
          style: theme.textTheme.bodyMedium?.copyWith(height: 1.5),
        ),
      ),
      actionsAlignment: MainAxisAlignment.spaceBetween,
      actions: [
        TextButton(
          key: const Key('optional-update-later-button'),
          onPressed: () {
            onDismiss();
            Navigator.of(context).pop();
          },
          child: Text(strings.updateLater),
        ),
        FilledButton(
          key: const Key('optional-update-now-button'),
          onPressed: () {
            _openStore(context);
            Navigator.of(context).pop();
          },
          child: Text(strings.updateNow),
        ),
      ],
    );
  }
}
