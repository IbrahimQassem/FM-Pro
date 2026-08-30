class AppNotification {
  const AppNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.receivedAt,
  });

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
