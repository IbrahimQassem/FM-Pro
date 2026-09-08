import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/notifications/domain/models/episode_alert_target.dart';
import 'package:hudhud_fm/features/notifications/presentation/episode_alert_navigation.dart';
import 'package:hudhud_fm/features/station_content/presentation/program_details_screen.dart';
import 'package:hudhud_fm/features/station_details/presentation/station_details_screen.dart';
import '../../../support/development_fixtures.dart';

const target = EpisodeAlertTarget(
    root: 'HudHudDev',
    eventId: 'HudHudDev:e',
    stationId: 's',
    programId: 'p',
    episodeId: 'e');
Widget entry() => Consumer(
    builder: (context, ref, _) => Scaffold(
        body: TextButton(
            onPressed: () => openEpisodeAlert(context, ref, target),
            child: const Text('Open alert'))));
void main() {
  for (final scenario in [
    'available',
    'missing-episode',
    'missing-station',
    'offline'
  ]) {
    testWidgets('alert navigation $scenario without autoplay', (tester) async {
      final harness = ReviewHarness();
      if (scenario == 'missing-episode') harness.content.episodes = [];
      if (scenario == 'missing-station') harness.stations.items = [];
      if (scenario == 'offline') harness.stations.fail = true;
      await tester.pumpWidget(harness.app(entry(), language: 'en'));
      await tester.tap(find.text('Open alert'));
      await tester.pumpAndSettle();
      expect(harness.audio.plays, 0);
      if (scenario == 'available') {
        expect(find.byType(ProgramDetailsScreen), findsOneWidget);
        expect(
            tester
                .widget<ProgramDetailsScreen>(find.byType(ProgramDetailsScreen))
                .highlightedEpisodeId,
            'e');
      } else if (scenario == 'missing-episode') {
        expect(find.byType(StationDetailsScreen), findsOneWidget);
      } else {
        expect(find.text('Open alert'), findsOneWidget);
        expect(find.byType(SnackBar), findsOneWidget);
      }
      await tester.pumpWidget(const SizedBox());
      await harness.subscriptions.dispose();
    });
  }
  testWidgets(
      'duplicate taps share one lookup and disposed navigation does not throw',
      (tester) async {
    final harness = ReviewHarness();
    harness.stations.pending = Completer<void>();
    await tester.pumpWidget(harness.app(entry()));
    await tester.tap(find.text('Open alert'));
    await tester.tap(find.text('Open alert'));
    expect(harness.stations.reads, 1);
    await tester.pumpWidget(const SizedBox());
    harness.stations.pending!.complete();
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(harness.audio.plays, 0);
  });
}
