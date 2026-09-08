import '../../../../core/config/firestore_paths.dart';
import '../../domain/models/episode_alert_target.dart';
import 'dart:async';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../domain/models/app_notification.dart';
import '../../domain/repositories/notifications_repository.dart';

class FirebaseNotificationsRepository implements NotificationsRepository {
  FirebaseNotificationsRepository(this._messaging,
      {Stream<RemoteMessage>? foregroundMessages,
      Stream<RemoteMessage>? openedMessages})
      : _foregroundMessages = foregroundMessages ?? FirebaseMessaging.onMessage,
        _openedMessages =
            openedMessages ?? FirebaseMessaging.onMessageOpenedApp;

  final Stream<RemoteMessage> _foregroundMessages;
  final Stream<RemoteMessage> _openedMessages;

  static const _preferenceKey = 'notifications.announcementsEnabled';
  static const _announcementsTopic = 'hudhud_fm_announcements';

  final FirebaseMessaging _messaging;
  final StreamController<AppNotification> _controller =
      StreamController<AppNotification>.broadcast();
  final List<StreamSubscription<RemoteMessage>> _subscriptions = [];
  bool _didInitialize = false;
  bool _disposed = false;
  Future<NotificationPreference>? _initializing;

  @override
  Stream<AppNotification> get incomingNotifications => _controller.stream;

  @override
  Future<NotificationPreference> initialize() {
    return _initializing ??=
        _initialize().whenComplete(() => _initializing = null);
  }

  Future<NotificationPreference> _initialize() async {
    if (_disposed) throw StateError('Notifications disposed');
    if (!_didInitialize) {
      await _messaging.setForegroundNotificationPresentationOptions(
        alert: false,
        badge: false,
        sound: false,
      );
      for (final subscription in _subscriptions) {
        await subscription.cancel();
      }
      _subscriptions.clear();
      if (_disposed) throw StateError('Notifications disposed');
      _subscriptions
        ..add(_foregroundMessages.listen(_emit))
        ..add(_openedMessages
            .listen((message) => _emit(message, openRequested: true)));
      final initial = await _messaging.getInitialMessage();
      if (_disposed) throw StateError('Notifications disposed');
      if (initial != null) _emit(initial, openRequested: true);
      _didInitialize = true;
    }

    final preferences = await SharedPreferences.getInstance();
    if (_disposed) throw StateError('Notifications disposed');
    final savedEnabled = preferences.getBool(_preferenceKey) ?? false;
    final settings = await _messaging.getNotificationSettings();
    if (_disposed) throw StateError('Notifications disposed');
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
    if (_disposed) throw StateError('Notifications disposed');
    final permission = _mapPermission(settings.authorizationStatus);
    if (permission != NotificationPermissionState.enabled) {
      await preferences.setBool(_preferenceKey, false);
      return NotificationPreference(isEnabled: false, permission: permission);
    }

    await _messaging.subscribeToTopic(_announcementsTopic);
    await preferences.setBool(_preferenceKey, true);
    return NotificationPreference(isEnabled: true, permission: permission);
  }

  void _emit(RemoteMessage message, {bool openRequested = false}) {
    if (_controller.isClosed) return;
    final notification = message.notification;
    final title =
        (notification?.title ?? message.data['title'] ?? '').toString().trim();
    final body =
        (notification?.body ?? message.data['body'] ?? '').toString().trim();
    if (title.isEmpty && body.isEmpty) return;
    final target = EpisodeAlertTarget.parse(message.data,
        expectedRoot: FirestorePaths.root);
    if (message.data['type'] == 'episode' && target == null) return;
    _controller.add(
      AppNotification(
        target: target,
        openRequested: openRequested,
        id: target?.eventId ??
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
      AuthorizationStatus.provisional =>
        NotificationPermissionState.enabled,
      AuthorizationStatus.denied ||
      AuthorizationStatus.deniedPermanently =>
        NotificationPermissionState.denied,
      AuthorizationStatus.notDetermined =>
        NotificationPermissionState.notDetermined,
    };
  }

  @override
  Future<void> dispose() async {
    _disposed = true;
    for (final subscription in _subscriptions) {
      await subscription.cancel();
    }
    await _controller.close();
  }
}
