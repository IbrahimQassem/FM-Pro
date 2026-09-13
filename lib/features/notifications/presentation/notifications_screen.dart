import 'episode_alert_navigation.dart';
import "../../../core/widgets/mascot_feedback_view.dart";
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../app/providers.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../domain/models/app_notification.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = AppLocalizations.of(context);
    final state = ref.watch(notificationsControllerProvider);
    final controller = ref.read(notificationsControllerProvider.notifier);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(strings.notifications)),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          children: [
            Card(
              elevation: 0,
              color: theme.colorScheme.surfaceContainerLow,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(
                  color: theme.colorScheme.outlineVariant.withValues(alpha: 0.4),
                ),
              ),
              child: SwitchListTile(
                key: const Key('notifications-toggle'),
                value: state.isEnabled,
                onChanged: state.isLoading ? null : controller.setEnabled,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                secondary: Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primaryContainer.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    state.isEnabled
                        ? Icons.notifications_active_rounded
                        : Icons.notifications_off_outlined,
                    color: theme.colorScheme.primary,
                    size: 22,
                  ),
                ),
                title: Text(
                  strings.notificationAnnouncements,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                subtitle: Text(
                  _preferenceDescription(
                    strings,
                    state.permission,
                    state.isEnabled,
                  ),
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                    height: 1.35,
                  ),
                ),
              ),
            ),
            if (state.hasFailure) ...[
              const SizedBox(height: 8),
              TextButton(
                onPressed: controller.retry,
                child: Text(strings.followRetry),
              ),
              const SizedBox(height: 6),
              Semantics(
                liveRegion: true,
                child: Text(
                  strings.notificationSetupError,
                  style: TextStyle(color: theme.colorScheme.error),
                ),
              ),
            ],
            const SizedBox(height: 24),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Text(
                strings.recentNotifications,
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: theme.colorScheme.primary,
                ),
              ),
            ),
            const SizedBox(height: 12),
            if (state.messages.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 24),
                child: MascotFeedbackView(
                  imageAsset: "assets/images/mascot/mascot_avatar_default.webp",
                  imageHeight: 140,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  title: strings.mascotEmptyNotificationsTitle,
                  subtitle: strings.mascotEmptyNotificationsSubtitle,
                ),
              )
            else
              for (final message in state.messages) ...[
                _NotificationCard(
                  message: message,
                  onTap: message.target == null
                      ? null
                      : () => openEpisodeAlert(context, ref, message.target!),
                ),
                const SizedBox(height: 8),
              ],
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest
                    .withValues(alpha: 0.35),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color:
                      theme.colorScheme.outlineVariant.withValues(alpha: 0.25),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.info_outline_rounded,
                    size: 18,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      strings.notificationSessionNote,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  String _preferenceDescription(
    AppLocalizations strings,
    NotificationPermissionState permission,
    bool enabled,
  ) {
    if (enabled) return strings.notificationsEnabled;
    return switch (permission) {
      NotificationPermissionState.denied => strings.notificationsDenied,
      NotificationPermissionState.unavailable => strings.notificationSetupError,
      NotificationPermissionState.notDetermined ||
      NotificationPermissionState.enabled =>
        strings.notificationsDisabled,
    };
  }
}

class _NotificationCard extends StatelessWidget {
  const _NotificationCard({required this.message, this.onTap});
  final VoidCallback? onTap;

  final AppNotification message;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final locale = Localizations.localeOf(context).toLanguageTag();
    final timestamp = DateFormat.yMMMd(
      locale,
    ).add_Hm().format(message.receivedAt);
    return Card(
      elevation: 0,
      color: theme.colorScheme.surfaceContainerLow,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: theme.colorScheme.outlineVariant.withValues(alpha: 0.4),
        ),
      ),
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        onTap: onTap,
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: theme.colorScheme.primaryContainer.withValues(alpha: 0.4),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(
            Icons.campaign_outlined,
            color: theme.colorScheme.primary,
            size: 22,
          ),
        ),
        title: message.title.isEmpty
            ? null
            : Text(
                message.title,
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (message.body.isNotEmpty) ...[
              const SizedBox(height: 2),
              Text(
                message.body,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurface,
                  height: 1.35,
                ),
              ),
            ],
            const SizedBox(height: 6),
            Text(
              timestamp,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
        trailing: onTap != null
            ? Icon(
                Icons.chevron_right_rounded,
                color: theme.colorScheme.onSurfaceVariant,
                size: 20,
              )
            : null,
      ),
    );
  }
}
