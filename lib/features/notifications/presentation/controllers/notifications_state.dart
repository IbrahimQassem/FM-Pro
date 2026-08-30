import '../../domain/models/app_notification.dart';

class NotificationsState {
  const NotificationsState({
    this.messages = const [],
    this.permission = NotificationPermissionState.notDetermined,
    this.isEnabled = false,
    this.isLoading = true,
    this.hasFailure = false,
  });

  final List<AppNotification> messages;
  final NotificationPermissionState permission;
  final bool isEnabled;
  final bool isLoading;
  final bool hasFailure;

  AppNotification? get latest => messages.isEmpty ? null : messages.first;

  NotificationsState copyWith({
    List<AppNotification>? messages,
    NotificationPermissionState? permission,
    bool? isEnabled,
    bool? isLoading,
    bool? hasFailure,
  }) {
    return NotificationsState(
      messages: messages ?? this.messages,
      permission: permission ?? this.permission,
      isEnabled: isEnabled ?? this.isEnabled,
      isLoading: isLoading ?? this.isLoading,
      hasFailure: hasFailure ?? this.hasFailure,
    );
  }
}
