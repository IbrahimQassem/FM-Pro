import "dart:async";

import "package:flutter/material.dart";
import "package:flutter_localizations/flutter_localizations.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:flutter_test/flutter_test.dart";
import "package:hudhud_fm/app/providers.dart";
import "package:hudhud_fm/core/widgets/mascot_feedback_view.dart";
import "package:hudhud_fm/features/notifications/domain/models/app_notification.dart";
import "package:hudhud_fm/features/notifications/domain/repositories/notifications_repository.dart";
import "package:hudhud_fm/features/notifications/presentation/notifications_screen.dart";
import "package:hudhud_fm/l10n/generated/app_localizations.dart";

class _FakeNotificationsRepo implements NotificationsRepository {
  final _controller = StreamController<AppNotification>.broadcast();

  @override
  Stream<AppNotification> get incomingNotifications => _controller.stream;

  @override
  Future<NotificationPreference> initialize() async => const NotificationPreference(
        isEnabled: false,
        permission: NotificationPermissionState.notDetermined,
      );

  @override
  Future<NotificationPreference> setEnabled(bool enabled) async =>
      NotificationPreference(
        isEnabled: enabled,
        permission: enabled
            ? NotificationPermissionState.enabled
            : NotificationPermissionState.notDetermined,
      );

  @override
  Future<void> dispose() => _controller.close();
}

void main() {
  testWidgets("displays mascot feedback view when notifications list is empty", (
    tester,
  ) async {
    final repo = _FakeNotificationsRepo();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          notificationsRepositoryProvider.overrideWithValue(repo),
        ],
        child: const MaterialApp(
          locale: Locale("ar"),
          supportedLocales: AppLocalizations.supportedLocales,
          localizationsDelegates: [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: NotificationsScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(MascotFeedbackView), findsOneWidget);
    expect(find.text("لا توجد إشعارات جديدة"), findsOneWidget);
    expect(
      find.text("سنوافيك بآخر تنبيهات البث المباشر والبرامج الجديدة فور صدورها."),
      findsOneWidget,
    );
  });
}
