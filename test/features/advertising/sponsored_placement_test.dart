import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/app/providers.dart';
import 'package:hudhud_fm/features/advertising/domain/sponsored_ad.dart';
import 'package:hudhud_fm/features/advertising/presentation/sponsored_placement.dart';
import 'package:hudhud_fm/l10n/generated/app_localizations.dart';

void main() {
  test('external sponsor actions reject unsafe hosts and schemes', () {
    for (final value in [
      'javascript:alert(1)',
      'http://company.com',
      'https://127.0.0.1',
      'https://[::1]',
      'https://u:p@company.com',
      'https://company.local'
    ]) {
      expect(isSafeAdUrl(value), isFalse);
    }
    expect(isSafeAdUrl('https://company.com/page'), isTrue);
  });
  testWidgets(
      'background time does not count, visible time deduplicates and expiry hides',
      (tester) async {
    var now = DateTime.utc(2026, 9, 20);
    final repository = _Ads()
      ..ad = SponsoredAd(
          deliveryId: 'delivery',
          title: 'Synthetic sponsor',
          sponsor: 'Company',
          body: '',
          imageUrl: '',
          targetUrl: '',
          expiresAt: now.add(const Duration(seconds: 10)));
    await tester.pumpWidget(ProviderScope(
        overrides: [
          advertisingRepositoryProvider.overrideWithValue(repository)
        ],
        child: MaterialApp(
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(body: SponsoredPlacement(clock: () => now)),
        )));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 250));
    expect(find.text('Synthetic sponsor'), findsOneWidget);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    now = now.add(const Duration(seconds: 3));
    await tester.pump(const Duration(seconds: 3));
    expect(repository.events, isEmpty);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pump(const Duration(milliseconds: 250));
    now = now.add(const Duration(seconds: 1));
    await tester.pump(const Duration(seconds: 1));
    expect(repository.events, ['impression']);
    now = now.add(const Duration(seconds: 1));
    await tester.pump(const Duration(seconds: 1));
    expect(repository.events, ['impression']);
    now = now.add(const Duration(seconds: 10));
    await tester.pump(const Duration(seconds: 1));
    expect(find.text('Synthetic sponsor'), findsNothing);
    await tester.pumpWidget(const SizedBox());
    expect(tester.takeException(), isNull);
  });
  testWidgets(
      'ad service failure leaves core content available and no retry loop',
      (tester) async {
    final repository = _Ads()..fail = true;
    final now = DateTime.utc(2026, 9, 20);
    await tester.pumpWidget(ProviderScope(
        overrides: [
          advertisingRepositoryProvider.overrideWithValue(repository)
        ],
        child: MaterialApp(
          home: Scaffold(
              body: Column(children: [
            const Text('Stations'),
            SponsoredPlacement(clock: () => now)
          ])),
        )));
    await tester.pump();
    await tester.pump(const Duration(seconds: 5));
    expect(find.text('Stations'), findsOneWidget);
    expect(repository.loads, 1);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });
}

class _Ads implements AdvertisingRepository {
  SponsoredAd? ad;
  bool fail = false;
  int loads = 0;
  final events = <String>[];
  @override
  Future<SponsoredAd?> load() async {
    loads++;
    if (fail) throw StateError('Synthetic');
    return ad;
  }

  @override
  Future<void> record(String deliveryId, String event) async {
    events.add(event);
  }
}
