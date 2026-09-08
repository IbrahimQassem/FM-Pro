import 'package:hudhud_fm/features/notifications/domain/models/episode_alert_target.dart';
import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/notifications/domain/models/app_notification.dart';
import 'package:hudhud_fm/features/notifications/domain/repositories/notifications_repository.dart';
import 'package:hudhud_fm/features/notifications/presentation/controllers/notifications_controller.dart';

void main() {
  test(
      'repeated open events are ignored even after a different message arrives',
      () async {
    final repository = _FakeNotificationsRepository();
    final controller = NotificationsController(repository);
    addTearDown(controller.dispose);
    await pumpEventQueue();
    final alert = AppNotification(
        id: 'HudHudDev:e',
        title: 'Episode',
        body: 'Body',
        receivedAt: DateTime.utc(2026),
        openRequested: true,
        target: const EpisodeAlertTarget(
            root: 'HudHudDev',
            eventId: 'HudHudDev:e',
            stationId: 's',
            programId: 'p',
            episodeId: 'e'));
    repository.emit(alert);
    await pumpEventQueue();
    repository.emit(_message('another'));
    await pumpEventQueue();
    repository.emit(alert);
    await pumpEventQueue();
    expect(controller.state.latest?.id, 'another');
    expect(controller.state.messages.length, 2);
  });

  test('loads opt-in and keeps the newest session message first', () async {
    final repository = _FakeNotificationsRepository();
    final controller = NotificationsController(repository);
    addTearDown(controller.dispose);

    await Future<void>.delayed(Duration.zero);
    expect(controller.state.isEnabled, isFalse);
    expect(controller.state.isLoading, isFalse);

    await controller.setEnabled(true);
    expect(controller.state.isEnabled, isTrue);

    repository.emit(_message('one'));
    repository.emit(_message('two'));
    await Future<void>.delayed(Duration.zero);
    expect(controller.state.latest?.id, 'two');
    expect(controller.state.messages.length, 2);
  });
}

NotificationPreference _preference(bool enabled) => NotificationPreference(
      isEnabled: enabled,
      permission: enabled
          ? NotificationPermissionState.enabled
          : NotificationPermissionState.notDetermined,
    );

AppNotification _message(String id) => AppNotification(
      id: id,
      title: 'Title $id',
      body: 'Body',
      receivedAt: DateTime.utc(2026, 8, 30),
    );

class _FakeNotificationsRepository implements NotificationsRepository {
  final _controller = StreamController<AppNotification>.broadcast();

  void emit(AppNotification message) => _controller.add(message);

  @override
  Stream<AppNotification> get incomingNotifications => _controller.stream;

  @override
  Future<NotificationPreference> initialize() async => _preference(false);

  @override
  Future<NotificationPreference> setEnabled(bool enabled) async =>
      _preference(enabled);

  @override
  Future<void> dispose() => _controller.close();
}
