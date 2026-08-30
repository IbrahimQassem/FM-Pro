import '../models/app_notification.dart';

abstract interface class NotificationsRepository {
  Stream<AppNotification> get incomingNotifications;

  Future<NotificationPreference> initialize();

  Future<NotificationPreference> setEnabled(bool enabled);

  Future<void> dispose();
}
