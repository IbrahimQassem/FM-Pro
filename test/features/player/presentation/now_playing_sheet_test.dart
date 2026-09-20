import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/app/providers.dart';
import 'package:hudhud_fm/features/player/presentation/widgets/mini_player.dart';
import 'package:hudhud_fm/features/player/presentation/widgets/now_playing_sheet.dart';
import '../../../support/development_fixtures.dart';

void main() {
  testWidgets('MiniPlayer opens NowPlayingSheet on tap and displays metadata',
      (tester) async {
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final harness = ReviewHarness();

    await tester.pumpWidget(
      harness.app(
        Consumer(
          builder: (context, ref, _) {
            final playerState = ref.watch(stationPlayerControllerProvider);
            final controller =
                ref.read(stationPlayerControllerProvider.notifier);

            return Scaffold(
              body: Center(
                child: ElevatedButton(
                  onPressed: () => controller.play(reviewStation),
                  child: const Text('Start Playback'),
                ),
              ),
              bottomNavigationBar: playerState.hasSelection
                  ? MiniPlayer(
                      state: playerState,
                      onToggle: controller.toggleCurrent,
                      onStop: controller.stop,
                    )
                  : null,
            );
          },
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    // Tap to start playback of the station
    await tester.tap(find.text('Start Playback'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    // Verify MiniPlayer is visible
    expect(find.byType(MiniPlayer), findsOneWidget);
    expect(find.text(reviewStation.name), findsOneWidget);

    // Tap MiniPlayer to open NowPlayingSheet
    await tester.tap(find.byType(MiniPlayer));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    // Verify NowPlayingSheet content
    expect(find.byType(NowPlayingSheet), findsOneWidget);
    expect(find.byIcon(Icons.skip_previous_rounded), findsOneWidget);
    expect(find.byIcon(Icons.skip_next_rounded), findsOneWidget);
    expect(find.byIcon(Icons.share_rounded), findsOneWidget);

    // Dismiss by tapping chevron down button
    await tester.tap(find.byIcon(Icons.keyboard_arrow_down_rounded));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    // Verify sheet is dismissed
    expect(find.byType(NowPlayingSheet), findsNothing);
  });

  testWidgets('Sleep timer modal opens and shows duration options',
      (tester) async {
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final harness = ReviewHarness();

    await tester.pumpWidget(
      harness.app(
        Consumer(
          builder: (context, ref, _) {
            final playerState = ref.watch(stationPlayerControllerProvider);
            final controller =
                ref.read(stationPlayerControllerProvider.notifier);

            return Scaffold(
              body: Center(
                child: ElevatedButton(
                  onPressed: () => controller.play(reviewStation),
                  child: const Text('Start Playback'),
                ),
              ),
              bottomNavigationBar: playerState.hasSelection
                  ? MiniPlayer(
                      state: playerState,
                      onToggle: controller.toggleCurrent,
                      onStop: controller.stop,
                    )
                  : null,
            );
          },
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    // Start playback
    await tester.tap(find.text('Start Playback'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    // Tap MiniPlayer to open NowPlayingSheet
    await tester.tap(find.byType(MiniPlayer));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    // Tap Sleep Timer button
    await tester.tap(find.byIcon(Icons.bedtime_outlined));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    // Verify sleep timer modal options appear
    expect(find.text('مؤقت النوم'), findsWidgets);
    expect(find.text('15 دقيقة'), findsOneWidget);
    expect(find.text('30 دقيقة'), findsOneWidget);
    expect(find.text('45 دقيقة'), findsOneWidget);
    expect(find.text('60 دقيقة'), findsOneWidget);

    // Select 30 minutes to close dialog
    await tester.tap(find.text('30 دقيقة'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    // Dismiss sheet
    await tester.tap(find.byIcon(Icons.keyboard_arrow_down_rounded));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    expect(find.byType(NowPlayingSheet), findsNothing);
  });
}
