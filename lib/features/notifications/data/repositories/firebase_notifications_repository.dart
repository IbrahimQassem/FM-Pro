import 'dart:async';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../domain/models/app_notification.dart';
import '../../domain/repositories/notifications_repository.dart';

class FirebaseNotificationsRepository implements NotificationsRepository {
  FirebaseNotificationsRepository(this._messaging);

  static const _preferenceKey = 'notifications.announcementsEnabled';
  static const _announcementsTopic = 'hudhud_fm_announcements';

  final FirebaseMessaging _messaging;
  final StreamController<AppNotification> _controller =
      StreamController<AppNotification>.broadcast();
  final List<StreamSubscription<RemoteMessage>> _subscriptions = [];
  bool _didInitialize = false;

  @override
  Stream<AppNotification> get incomingNotifications => _controller.stream;

  @override
  Future<NotificationPreference> initialize() async {
    if (!_didInitialize) {
      _didInitialize = true;
      await _messaging.setForegroundNotificationPresentationOptions(
        alert: false,
        badge: false,
        sound: false,
      );
      _subscriptions
        ..add(FirebaseMessaging.onMessage.listen(_emit))
        ..add(FirebaseMessaging.onMessageOpenedApp.listen(_emit));
      final initial = await _messaging.getInitialMessage();
      if (initial != null) _emit(initial);
    }

    final preferences = await SharedPreferences.getInstance();
    final savedEnabled = preferences.getBool(_preferenceKey) ?? false;
    final settings = await _messaging.getNotificationSettings();
    final permission = _mapPermission(settings.authorizationStatus);
    final canReceive = permission == NotificationPermissionState.enabled;
    if (savedEnabled && canReceive) {
      await _messaging.subscribeToTopic(_announcementsTopic);
    }
    return NotificationPreference(
      isEnabled: savedEnabled && canReceive,
      permission: permission,
    );
  }

  @override
  Future<NotificationPreference> setEnabled(bool enabled) async {
    final preferences = await SharedPreferences.getInstance();
    if (!enabled) {
      await _messaging.unsubscribeFromTopic(_announcementsTopic);
      await preferences.setBool(_preferenceKey, false);
      final settings = await _messaging.getNotificationSettings();
      return NotificationPreference(
        isEnabled: false,
        permission: _mapPermission(settings.authorizationStatus),
      );
    }

    final settings = await _messaging.requestPermission(
      alert: true,
      announcement: false,
      badge: true,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
      sound: true,
    );
    final permission = _mapPermission(settings.authorizationStatus);
    if (permission != NotificationPermissionState.enabled) {
      await preferences.setBool(_preferenceKey, false);
      return NotificationPreference(isEnabled: false, permission: permission);
    }

    await _messaging.subscribeToTopic(_announcementsTopic);
    await preferences.setBool(_preferenceKey, true);
    return NotificationPreference(isEnabled: true, permission: permission);
  }

  void _emit(RemoteMessage message) {
    if (_controller.isClosed) return;
    final notification = message.notification;
    final title = (notification?.title ?? message.data['title'] ?? '')
        .toString()
        .trim();
    final body = (notification?.body ?? message.data['body'] ?? '')
        .toString()
        .trim();
    if (title.isEmpty && body.isEmpty) return;
    _controller.add(
      AppNotification(
        id:
            message.messageId ??
            '${message.sentTime?.millisecondsSinceEpoch ?? DateTime.now().millisecondsSinceEpoch}',
        title: title,
        body: body,
        receivedAt: message.sentTime ?? DateTime.now(),
      ),
    );
  }

  static NotificationPermissionState _mapPermission(
    AuthorizationStatus status,
  ) {
    return switch (status) {
      AuthorizationStatus.authorized ||
      AuthorizationStatus.provisional => NotificationPermissionState.enabled,
      AuthorizationStatus.denied || AuthorizationStatus.deniedPermanently =>
        NotificationPermissionState.denied,
      AuthorizationStatus.notDetermined =>
        NotificationPermissionState.notDetermined,
    };
  }

  @override
  Future<void> dispose() async {
    for (final subscription in _subscriptions) {
      await subscription.cancel();
    }
    await _controller.close();
  }
}
