import 'dart:async';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:hudhud_fm/features/notifications/data/repositories/firebase_notifications_repository.dart';
import 'package:hudhud_fm/features/notifications/domain/models/app_notification.dart';

class Settings implements NotificationSettings {
  Settings([this.authorizationStatus = AuthorizationStatus.denied]);
  @override
  final AuthorizationStatus authorizationStatus;
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class Messaging implements FirebaseMessaging {
  int attempts = 0;
  AuthorizationStatus status = AuthorizationStatus.denied;
  final subscribed = <String>[];
  final unsubscribed = <String>[];
  @override
  Future<void> subscribeToTopic(String topic) async => subscribed.add(topic);
  @override
  Future<void> unsubscribeFromTopic(String topic) async =>
      unsubscribed.add(topic);
  Completer<RemoteMessage?>? pending;
  @override
  Future<void> setForegroundNotificationPresentationOptions(
      {bool alert = false, bool badge = false, bool sound = false}) async {}
  @override
  Future<RemoteMessage?> getInitialMessage() async {
    attempts++;
    if (pending != null) return pending!.future;
    if (attempts == 1) throw Exception('platform initialization failed');
    return const RemoteMessage(
        messageId: 'initial',
        notification: RemoteNotification(title: 'Synthetic initial'));
  }

  @override
  Future<NotificationSettings> getNotificationSettings() async =>
      Settings(status);
  // Permission/token calls have no implementation: initialization must not prompt.
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() => SharedPreferences.setMockInitialValues({}));
  test(
      'partial initialization retries without duplicate listeners or prompting',
      () async {
    final messaging = Messaging();
    final foreground = StreamController<RemoteMessage>.broadcast();
    final opened = StreamController<RemoteMessage>.broadcast();
    final repository = FirebaseNotificationsRepository(messaging,
        foregroundMessages: foreground.stream, openedMessages: opened.stream);
    final events = <AppNotification>[];
    final listener = repository.incomingNotifications.listen(events.add);
    await expectLater(repository.initialize(), throwsException);
    await Future.wait([repository.initialize(), repository.initialize()]);
    foreground.add(const RemoteMessage(
        messageId: 'foreground',
        notification: RemoteNotification(title: 'Synthetic foreground')));
    opened.add(const RemoteMessage(
        messageId: 'opened',
        notification: RemoteNotification(title: 'Synthetic opened')));
    await pumpEventQueue();
    expect(messaging.attempts, 2);
    expect(
        events.map((event) => event.id), ['initial', 'foreground', 'opened']);
    expect(events.where((event) => event.openRequested).length, 2);
    await repository.dispose();
    expect(foreground.hasListener, false);
    expect(opened.hasListener, false);
    await listener.cancel();
    await foreground.close();
    await opened.close();
  });
  for (final root in ['HudHudDev', 'HudHudOfficial']) {
    test('$root reconciles legacy topic membership and opt-out', () async {
      SharedPreferences.setMockInitialValues(
          {'notifications.announcementsEnabled': true});
      final messaging = Messaging()
        ..attempts = 1
        ..status = AuthorizationStatus.authorized;
      final current = root == 'HudHudDev'
          ? 'hudhuddev_hudhud_fm_announcements'
          : 'hudhud_fm_announcements';
      final other = root == 'HudHudDev'
          ? 'hudhud_fm_announcements'
          : 'hudhuddev_hudhud_fm_announcements';
      final repository = FirebaseNotificationsRepository(messaging,
          root: root,
          foregroundMessages: const Stream.empty(),
          openedMessages: const Stream.empty());
      expect((await repository.initialize()).isEnabled, true);
      expect(messaging.subscribed, [current]);
      expect(messaging.unsubscribed, contains(other));
      expect((await repository.setEnabled(false)).isEnabled, false);
      expect(messaging.unsubscribed, contains(current));
      await repository.dispose();
    });
  }
  test(
      'notifications from another root are ignored before entering the session list',
      () async {
    final messaging = Messaging()..attempts = 1;
    final foreground = StreamController<RemoteMessage>.broadcast();
    final repository = FirebaseNotificationsRepository(messaging,
        root: 'HudHudDev',
        foregroundMessages: foreground.stream,
        openedMessages: const Stream.empty());
    final events = <AppNotification>[];
    final listener = repository.incomingNotifications.listen(events.add);
    await repository.initialize();
    foreground.add(const RemoteMessage(
        messageId: 'other-root',
        data: {'root': 'HudHudOfficial', 'type': 'general'},
        notification: RemoteNotification(title: 'Other root')));
    foreground.add(const RemoteMessage(
        messageId: 'own-root',
        data: {'root': 'HudHudDev', 'type': 'general'},
        notification: RemoteNotification(title: 'Own root')));
    await pumpEventQueue();
    expect(events.map((event) => event.id), ['initial', 'own-root']);
    await repository.dispose();
    await listener.cancel();
    await foreground.close();
  });
  test('dispose during initial message retrieval stops initialization',
      () async {
    final messaging = Messaging()..pending = Completer<RemoteMessage?>();
    final foreground = StreamController<RemoteMessage>.broadcast();
    final opened = StreamController<RemoteMessage>.broadcast();
    final repository = FirebaseNotificationsRepository(messaging,
        foregroundMessages: foreground.stream, openedMessages: opened.stream);
    final initialization = repository.initialize();
    final expectation = expectLater(initialization, throwsStateError);
    await pumpEventQueue();
    await repository.dispose();
    messaging.pending!.complete(null);
    await expectation;
    expect(foreground.hasListener, false);
    expect(opened.hasListener, false);
    await foreground.close();
    await opened.close();
  });
}
