import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/account/domain/models/account_user.dart';
import 'package:hudhud_fm/features/home/presentation/controllers/home_state.dart';
import 'package:hudhud_fm/features/subscriptions/domain/station_subscription.dart';
import 'package:hudhud_fm/features/subscriptions/presentation/my_stations_screen.dart';
import '../../support/development_fixtures.dart';

void main() {
  testWidgets(
      'My Stations gates accounts, retries errors, unfollows unavailable stations and resets identity',
      (tester) async {
    final harness = ReviewHarness();
    await tester
        .pumpWidget(harness.app(const MyStationsScreen(), language: 'en'));
    harness.accounts.emitUser(null);
    await tester.pumpAndSettle();
    expect(find.byType(FilledButton), findsOneWidget);
    harness.accounts.emitUser(const AccountUser(
        uid: 'a',
        displayName: 'A',
        email: 'a@example.test',
        emailVerified: true));
    await tester.pump();
    await tester.pump();
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    harness.subscriptions.streams['a']!.add(const SubscriptionBatch({}));
    await tester.pumpAndSettle();
    expect(find.byType(Card), findsNothing);
    harness.subscriptions.streams['a']!.addError(Exception('offline'));
    await tester.pumpAndSettle();
    expect(find.byType(TextButton), findsOneWidget);
    await tester.tap(find.byType(TextButton));
    await tester.pump();
    await tester.pump();
    harness.home
        .show(const HomeState(isInitialLoading: false, isOffline: true));
    harness.subscriptions.streams['a']!.add(const SubscriptionBatch({
      'missing': StationSubscription(
          stationId: 'missing', isActive: true, notificationsEnabled: false)
    }, isOffline: true));
    await tester.pumpAndSettle();
    expect(tester.widget<ListTile>(find.byType(ListTile).first).onTap, isNull);
    await tester.tap(find.byKey(const Key('station-follow-missing')));
    await tester.pumpAndSettle();
    expect(harness.subscriptions.writes, 1);
    expect(find.byType(Card), findsNothing);
    harness.subscriptions.streams['a']!.add(const SubscriptionBatch({
      's': StationSubscription(
          stationId: 's', isActive: true, notificationsEnabled: false)
    }));
    await tester.pumpAndSettle();
    expect(find.byType(Card), findsOneWidget);
    harness.accounts.emitUser(const AccountUser(
        uid: 'b',
        displayName: 'B',
        email: 'b@example.test',
        emailVerified: true));
    await tester.pump();
    await tester.pump();
    expect(find.byType(Card), findsNothing);
    harness.subscriptions.streams['b']!.add(const SubscriptionBatch({}));
    await tester.pumpAndSettle();
    expect(find.byType(Card), findsNothing);
    await tester.pumpWidget(const SizedBox());
    await harness.subscriptions.dispose();
  });
}
