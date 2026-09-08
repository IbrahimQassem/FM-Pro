import 'dart:async';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:hudhud_fm/features/notifications/data/repositories/firebase_notifications_repository.dart';
import 'package:hudhud_fm/features/notifications/domain/models/app_notification.dart';

class Settings implements NotificationSettings {
  @override
  AuthorizationStatus get authorizationStatus => AuthorizationStatus.denied;
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class Messaging implements FirebaseMessaging {
  int attempts = 0;
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
  Future<NotificationSettings> getNotificationSettings() async => Settings();
  // Permission/token/topic calls deliberately have no implementation: initialization must not invoke them.
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
