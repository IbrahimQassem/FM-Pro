import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/config/app_config.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../domain/models/app_update_info.dart';

/// Full-screen blocking gate requiring user to update before continuing.
class ForceUpdateScreen extends StatelessWidget {
  const ForceUpdateScreen({
    this.updateInfo,
    super.key,
  });

  final AppUpdateInfo? updateInfo;

  Future<void> _openStore(BuildContext context) async {
    final isIos = !kIsWeb && defaultTargetPlatform == TargetPlatform.iOS;
    final primaryUrl = isIos
        ? (updateInfo?.storeUrlIos ?? AppConfig.appStoreUrl)
        : (updateInfo?.storeUrlAndroid ?? AppConfig.playStoreMarketUrl);
    final fallbackUrl = isIos
        ? (updateInfo?.storeUrlIos ?? AppConfig.appStoreUrl)
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
        debugPrint('ForceUpdateScreen: Could not launch store url: $e');
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
            ? updateInfo?.forceUpdateTitleAr
            : updateInfo?.forceUpdateTitleEn) ??
        strings.forceUpdateTitle;

    final message = (isArabic
            ? updateInfo?.forceUpdateMessageAr
            : updateInfo?.forceUpdateMessageEn) ??
        strings.forceUpdateMessage;

    return PopScope(
      canPop: false,
      child: Scaffold(
        body: DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [colors.primaryContainer.withValues(alpha: 0.35), colors.surface],
            ),
          ),
          child: SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Mascot Identity with update alert styling
                      Container(
                        width: 120,
                        height: 120,
                        decoration: BoxDecoration(
                          color: colors.surface,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: colors.primary.withValues(alpha: 0.18),
                              blurRadius: 28,
                              spreadRadius: 4,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        padding: const EdgeInsets.all(16),
                        child: Image.asset(
                          'assets/images/mascot/mascot_onboarding.webp',
                          fit: BoxFit.contain,
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Version Badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.amber.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: Colors.amber.withValues(alpha: 0.6),
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.warning_amber_rounded,
                              size: 16,
                              color: Colors.amber,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              '${strings.appVersionLabel} ${updateInfo?.latestVersionName ?? AppConfig.currentVersionName}',
                              style: theme.textTheme.labelMedium?.copyWith(
                                fontWeight: FontWeight.w800,
                                color: colors.onSurface,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 18),

                      // Title
                      Text(
                        title,
                        textAlign: TextAlign.center,
                        style: theme.textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w900,
                          color: colors.onSurface,
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Description
                      Text(
                        message,
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: colors.onSurfaceVariant,
                          height: 1.6,
                        ),
                      ),
                      const SizedBox(height: 32),

                      // Mandatory Update Button
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: FilledButton.icon(
                          key: const Key('force-update-now-button'),
                          onPressed: () => _openStore(context),
                          icon: const Icon(Icons.system_update_rounded),
                          label: Text(
                            strings.updateNow,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
