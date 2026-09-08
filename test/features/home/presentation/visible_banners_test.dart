import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/l10n/generated/app_localizations.dart';
import 'package:hudhud_fm/features/home/domain/models/banner_item.dart';
import 'package:hudhud_fm/features/home/presentation/widgets/visible_banners.dart';
import 'package:hudhud_fm/features/home/presentation/widgets/banner_carousel.dart';

void main() {
  testWidgets(
      'resume removes expired banners and changed audience resets carousel',
      (tester) async {
    var now = DateTime.utc(2026, 9, 8);
    BannerItem banner(String id) => BannerItem(
        id: id,
        title: id,
        imageUrl: 'https://example.test/image.png',
        targetType: 'none',
        targetId: '',
        targetUrl: '',
        priority: 1,
        isActive: true,
        expiresAt: DateTime.utc(2026, 9, 8, 0, 1));
    Future<void> show(List<BannerItem> items) => tester.pumpWidget(MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home:
            Scaffold(body: VisibleBanners(banners: items, clock: () => now))));
    await show([banner('one'), banner('two')]);
    await tester.drag(find.byType(PageView), const Offset(-700, 0));
    await tester.pump(const Duration(milliseconds: 400));
    await show([banner('two')]);
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('two'), findsOneWidget);
    expect(tester.takeException(), isNull);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    now = now.add(const Duration(minutes: 2));
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pump();
    expect(find.byType(BannerCarousel), findsNothing);
    await tester.pumpWidget(const SizedBox());
  });
  testWidgets('an open screen shows a starting banner and removes it at expiry',
      (tester) async {
    var now = DateTime.utc(2026, 9, 8);
    final banner = BannerItem(
        id: 'scheduled',
        title: 'Scheduled',
        imageUrl: 'https://example.test/image.png',
        targetType: 'none',
        targetId: '',
        targetUrl: '',
        priority: 1,
        isActive: true,
        startAt: now.add(const Duration(seconds: 1)),
        expiresAt: now.add(const Duration(seconds: 2)));
    await tester.pumpWidget(MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
            body: VisibleBanners(banners: [banner], clock: () => now))));
    expect(find.byType(BannerCarousel), findsNothing);
    now = now.add(const Duration(seconds: 1));
    await tester.pump(const Duration(seconds: 1));
    expect(find.byType(BannerCarousel), findsOneWidget);
    now = now.add(const Duration(seconds: 1));
    await tester.pump(const Duration(seconds: 1));
    expect(find.byType(BannerCarousel), findsNothing);
    await tester.pumpWidget(const SizedBox());
  });
}
