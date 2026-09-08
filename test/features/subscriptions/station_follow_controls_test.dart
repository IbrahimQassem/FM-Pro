import 'package:flutter/services.dart';
import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hudhud_fm/app/providers.dart';
import 'package:hudhud_fm/core/theme/app_theme.dart';
import 'package:hudhud_fm/l10n/generated/app_localizations.dart';
import 'package:hudhud_fm/features/account/domain/models/account_user.dart';
import 'package:hudhud_fm/features/subscriptions/domain/station_subscription.dart';
import 'package:hudhud_fm/features/subscriptions/presentation/station_follow_controls.dart';
import '../favorites/presentation/favorites_controller_test.dart'
    show FakeAccountRepository;
import 'station_subscriptions_controller_test.dart' show FakeSubscriptions;

void main() {
  for (final language in ['ar', 'en']) {
    testWidgets(
        '$language follow flow fits a small phone at 200% text and keeps follow after permission denial',
        (tester) async {
      tester.view.physicalSize = const Size(360, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final fontPath = Platform.environment['HUDHUD_REVIEW_FONT'];
      if (fontPath != null) {
        await tester.runAsync(() async {
          final loader = FontLoader('Roboto')
            ..addFont(File(fontPath)
                .readAsBytes()
                .then((bytes) => ByteData.sublistView(bytes)));
          await loader.load();
          final icons = FontLoader('MaterialIcons')
            ..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'));
          await icons.load();
        });
      }
      final accounts = FakeAccountRepository();
      final subscriptions = FakeSubscriptions();
      final boundary = GlobalKey();
      await tester.pumpWidget(ProviderScope(
          overrides: [
            accountRepositoryProvider.overrideWithValue(accounts),
            stationSubscriptionsRepositoryProvider
                .overrideWithValue(subscriptions)
          ],
          child: MaterialApp(
              theme: AppTheme.light(),
              locale: Locale(language),
              supportedLocales: AppLocalizations.supportedLocales,
              localizationsDelegates: AppLocalizations.localizationsDelegates,
              home: RepaintBoundary(
                  key: boundary,
                  child: Scaffold(
                      body: MediaQuery(
                          data: const MediaQueryData(
                              textScaler: TextScaler.linear(2)),
                          child: const SafeArea(
                              child: SingleChildScrollView(
                                  padding: EdgeInsets.all(16),
                                  child: StationFollowControls(
                                      stationId: 's')))))))));
      accounts.emitUser(const AccountUser(
          uid: 'a',
          displayName: 'A',
          email: 'a@example.test',
          emailVerified: true));
      await tester.pump();
      subscriptions.streams['a']!.add(const SubscriptionBatch({}));
      await tester.pumpAndSettle();
      final follow = find.byKey(const Key('station-follow-s'));
      expect(tester.getSize(follow).height, greaterThanOrEqualTo(48));
      await tester.tap(follow);
      await tester.pumpAndSettle();
      expect(find.byType(SwitchListTile), findsOneWidget);
      subscriptions.permission = false;
      await tester.tap(find.byType(SwitchListTile));
      await tester.pumpAndSettle();
      expect(subscriptions.writes, 1);
      expect(tester.takeException(), isNull);
      // Development review evidence, not a golden baseline or device verification.
      await tester.runAsync(() async {
        final image = await (boundary.currentContext!.findRenderObject()
                as RenderRepaintBoundary)
            .toImage();
        final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
        final directory = Directory('build/review/subscriptions')
          ..createSync(recursive: true);
        await File('${directory.path}/follow-$language-200.png')
            .writeAsBytes(bytes!.buffer.asUint8List());
        image.dispose();
      });
      await tester.pumpWidget(const SizedBox());
      await subscriptions.dispose();
    });
  }
}
