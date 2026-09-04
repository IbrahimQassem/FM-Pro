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
    return Scaffold(
      appBar: AppBar(title: Text(strings.notifications)),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: SwitchListTile(
                key: const Key('notifications-toggle'),
                value: state.isEnabled,
                onChanged: state.isLoading ? null : controller.setEnabled,
                secondary: const Icon(Icons.notifications_active_outlined),
                title: Text(strings.notificationAnnouncements),
                subtitle: Text(
                  _preferenceDescription(
                    strings,
                    state.permission,
                    state.isEnabled,
                  ),
                ),
              ),
            ),
            if (state.hasFailure) ...[
              const SizedBox(height: 10),
              Semantics(
                liveRegion: true,
                child: Text(
                  strings.notificationSetupError,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
            ],
            const SizedBox(height: 22),
            Text(
              strings.recentNotifications,
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 10),
            if (state.messages.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 20),
                child: MascotFeedbackView(
                  imageAsset: "assets/images/mascot/mascot_avatar_default.webp",
                  imageHeight: 140,
                  title: strings.mascotEmptyNotificationsTitle,
                  subtitle: strings.mascotEmptyNotificationsSubtitle,
                ),
              )
            else
              for (final message in state.messages) ...[
                _NotificationCard(message: message),
                const SizedBox(height: 9),
              ],
            Text(
              strings.notificationSessionNote,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
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
      NotificationPermissionState.enabled => strings.notificationsDisabled,
    };
  }
}

class _NotificationCard extends StatelessWidget {
  const _NotificationCard({required this.message});

  final AppNotification message;

  @override
  Widget build(BuildContext context) {
    final locale = Localizations.localeOf(context).toLanguageTag();
    final timestamp = DateFormat.yMMMd(
      locale,
    ).add_Hm().format(message.receivedAt);
    return Card(
      child: ListTile(
        leading: const CircleAvatar(child: Icon(Icons.campaign_outlined)),
        title: message.title.isEmpty ? null : Text(message.title),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (message.body.isNotEmpty) Text(message.body),
            const SizedBox(height: 5),
            Text(timestamp, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}
