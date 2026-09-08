import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/station_details/presentation/station_details_screen.dart';
import '../../../support/development_fixtures.dart';

void main() {
  testWidgets(
      'station clock updates at minute boundary and immediately on resume',
      (tester) async {
    var now = DateTime.utc(2026, 9, 8, 20, 59, 59);
    final harness = ReviewHarness();
    await tester.pumpWidget(harness
        .app(StationDetailsScreen(station: reviewStation, clock: () => now)));
    await tester.pumpAndSettle();
    DateTime? rendered() =>
        tester.widget<StationDetailsView>(find.byType(StationDetailsView)).now;
    expect(rendered(), now);
    now = now.add(const Duration(seconds: 1));
    await tester.pump(const Duration(seconds: 1));
    expect(rendered(), now);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    now = now.add(const Duration(days: 1));
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pump();
    expect(rendered(), now);
    await tester.pumpWidget(const SizedBox());
    await tester.pump(const Duration(minutes: 2));
    expect(tester.takeException(), isNull);
    await harness.subscriptions.dispose();
  });
}
