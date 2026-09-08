import 'episode_alert_target.dart';

class AppNotification {
  const AppNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.receivedAt,
    this.target,
    this.openRequested = false,
  });

  final EpisodeAlertTarget? target;
  final bool openRequested;
  final String id;
  final String title;
  final String body;
  final DateTime receivedAt;
}

enum NotificationPermissionState { notDetermined, enabled, denied, unavailable }

class NotificationPreference {
  const NotificationPreference({
    required this.isEnabled,
    required this.permission,
  });

  final bool isEnabled;
  final NotificationPermissionState permission;
}
