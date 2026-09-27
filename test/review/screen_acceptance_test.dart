import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/home/presentation/widgets/home_view.dart';
import 'package:hudhud_fm/features/home/presentation/controllers/home_state.dart';
import 'package:hudhud_fm/features/station_details/presentation/station_details_screen.dart';
import 'package:hudhud_fm/features/station_content/presentation/program_details_screen.dart';
import 'package:hudhud_fm/features/player/presentation/widgets/mini_player.dart';
import 'package:hudhud_fm/features/player/presentation/controllers/station_player_state.dart';
import 'package:hudhud_fm/features/account/presentation/account_screen.dart';
import 'package:hudhud_fm/features/account/presentation/sign_in_screen.dart';
import 'package:hudhud_fm/features/account/presentation/register_screen.dart';
import 'package:hudhud_fm/features/subscriptions/presentation/my_stations_screen.dart';
import 'package:hudhud_fm/features/subscriptions/domain/station_subscription.dart';
import 'package:hudhud_fm/features/account/domain/models/account_user.dart';
import '../support/development_fixtures.dart';

void main() {
  for (final language in ['ar', 'en']) {
    for (final scale in [1.0, 2.0]) {
      for (final surface in [
        'home',
        'station',
        'program',
        'account',
        'sign-in',
        'register',
        'my-stations'
      ]) {
        testWidgets('$surface $language ${scale}x screen acceptance',
            (tester) async {
          tester.view.physicalSize =
              scale == 2 ? const Size(360, 800) : const Size(430, 932);
          if (Platform.environment['HUDHUD_REVIEW_PLATFORM'] != null &&
              scale == 1) {
            tester.view.physicalSize =
                Platform.environment['HUDHUD_REVIEW_PLATFORM'] == 'ios'
                    ? const Size(402, 873)
                    : const Size(412, 891);
            tester.view.padding = const FakeViewPadding(top: 60, bottom: 28);
            addTearDown(tester.view.resetPadding);
          }
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          final reviewTheme = Platform.environment['HUDHUD_REVIEW_THEME'];
          final themeMode =
              reviewTheme == 'dark' ? ThemeMode.dark : ThemeMode.light;
          final captureRatio = double.tryParse(
                  Platform.environment['HUDHUD_REVIEW_PIXEL_RATIO'] ?? '') ??
              1;
          final fontPath = Platform.environment['HUDHUD_REVIEW_FONT'];
          if (fontPath != null) {
            await tester.runAsync(() async {
              for (final family in [
                'Roboto',
                'CupertinoSystemText',
                'CupertinoSystemDisplay'
              ]) {
                await (FontLoader(family)
                      ..addFont(File(fontPath)
                          .readAsBytes()
                          .then(ByteData.sublistView)))
                    .load();
              }
              await (FontLoader('MaterialIcons')
                    ..addFont(
                        rootBundle.load('fonts/MaterialIcons-Regular.otf')))
                  .load();
            });
          }
          final harness = ReviewHarness();
          final playerState = StationPlayerState(
              station: reviewStation, status: StationPlaybackStatus.playing);
          final player =
              MiniPlayer(state: playerState, onToggle: () {}, onStop: () {});
          final Widget child = switch (surface) {
            'home' => HomeView(
                state: const HomeState(
                    stations: [reviewStation], isInitialLoading: false),
                onRefresh: () async {},
                onSearchChanged: (_) {},
                onCitySelected: (_) {},
                onViewModeChanged: (_) {},
                onNotificationsPressed: () {},
                onSettingsPressed: () {},
                onStationPressed: (_) {},
                onStationPlayPressed: (_) {},
                playerBar: player),
            'station' => StationDetailsView(
                station: reviewStation,
                playbackStatus: StationPlaybackStatus.playing,
                onPlayPressed: () {},
                onStopPressed: () {},
                playerBar: player),
            'program' => ProgramDetailsView(
                station: reviewStation,
                program: reviewProgram,
                episodes: [reviewEpisode],
                playerState: playerState,
                onEpisodePlayPressed: (_) {},
                playerBar: player),
            'account' => const AccountScreen(),
            'sign-in' => const SignInScreen(),
            'register' => const RegisterScreen(),
            _ => const MyStationsScreen(),
          };
          final boundary = GlobalKey();
          await tester.pumpWidget(harness.app(
              RepaintBoundary(key: boundary, child: child),
              language: language,
              themeMode: themeMode,
              scale: scale));
          harness.accounts.emitUser(null);
          await tester.pump();
          if (surface == 'my-stations') {
            harness.accounts.emitUser(const AccountUser(
                uid: 'a',
                displayName: 'مستمع تجريبي',
                email: 'listener@example.test',
                emailVerified: true));
            await tester.pump();
            harness.subscriptions.streams['a']!.add(const SubscriptionBatch({
              's': StationSubscription(
                  stationId: 's', isActive: true, notificationsEnabled: false)
            }));
          }
          await tester.pumpAndSettle();
          final errors = <Object>[];
          Object? error;
          while ((error = tester.takeException()) != null) {
            errors.add(error!);
          }
          if (fontPath != null) {
            await tester.runAsync(() async {
              for (final asset in [
                'assets/images/mascot/mascot_avatar_default.webp',
                'assets/images/mascot/mascot_onboarding.webp',
                'assets/images/branding/mascot_radio_placeholder.webp',
                'assets/images/branding/station_placeholder.webp',
              ]) {
                await precacheImage(
                    AssetImage(asset), boundary.currentContext!);
              }
            });
            await tester.pumpAndSettle();
          }
          final stage = Platform.environment['HUDHUD_REVIEW_STAGE'] ?? 'after';
          if (fontPath != null) {
            await tester.runAsync(() async {
              final image = await (boundary.currentContext!.findRenderObject()
                      as RenderRepaintBoundary)
                  .toImage(pixelRatio: captureRatio);
              final bytes =
                  await image.toByteData(format: ui.ImageByteFormat.png);
              final dir = Directory('build/review/continuation/$stage')
                ..createSync(recursive: true);
              await File('${dir.path}/$surface-$language-${scale}x.png')
                  .writeAsBytes(bytes!.buffer.asUint8List());
              image.dispose();
            });
          }
          expect(errors, isEmpty,
              reason: 'No screen overflow or rendering exceptions');
          if (surface == 'my-stations') {
            final semantics = tester.ensureSemantics();
            await tester.pump();
            await expectLater(
                tester, meetsGuideline(androidTapTargetGuideline));
            await expectLater(
                tester, meetsGuideline(labeledTapTargetGuideline));
            semantics.dispose();
          }
          if (surface == 'sign-in' || surface == 'register') {
            final field = find.byKey(
                Key(surface == 'register' ? 'account-name' : 'account-email'));
            await tester.scrollUntilVisible(field, 200,
                scrollable: find.byType(Scrollable).first);
            await tester.tap(field);
            tester.view.viewInsets = const FakeViewPadding(bottom: 300);
            await tester.pumpAndSettle();
            expect(tester.takeException(), isNull);
            tester.view.resetViewInsets();
          }
          await tester.pumpWidget(const SizedBox());
          await harness.subscriptions.dispose();
        },
            variant: TargetPlatformVariant({
              Platform.environment['HUDHUD_REVIEW_PLATFORM'] == 'ios'
                  ? TargetPlatform.iOS
                  : TargetPlatform.android
            }));
      }
    }
  }

  for (final themeMode in [ThemeMode.light, ThemeMode.dark]) {
    testWidgets('account screen acceptance in ${themeMode.name} mode',
        (tester) async {
      final harness = ReviewHarness();
      await tester
          .pumpWidget(harness.app(const AccountScreen(), themeMode: themeMode));
      harness.accounts.emitUser(null);
      await tester.pumpAndSettle();
      expect(find.byType(AccountScreen), findsOneWidget);
      expect(find.byKey(const Key("account-language-setting")), findsOneWidget);
      expect(find.byKey(const Key("account-theme-setting")), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  }
}
