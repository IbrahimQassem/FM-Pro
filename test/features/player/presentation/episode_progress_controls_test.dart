import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/app/providers.dart';
import 'package:hudhud_fm/features/player/domain/models/audio_playback_progress.dart';
import 'package:hudhud_fm/features/player/presentation/controllers/station_player_controller.dart';
import 'package:hudhud_fm/features/player/presentation/controllers/station_player_state.dart';
import 'package:hudhud_fm/features/player/presentation/widgets/episode_progress_controls.dart';
import 'package:hudhud_fm/l10n/generated/app_localizations.dart';
import '../../../support/development_fixtures.dart';

class _Player extends StationPlayerController {
  _Player() : super(ReviewAudio()) {
    state = StationPlayerState(
        station: reviewStation,
        episode: reviewEpisode,
        status: StationPlaybackStatus.paused);
  }
  final seeks = <Duration>[];
  Completer<void>? pendingSeek;
  @override
  Future<bool> seek(Duration position, {required String episodeId}) async {
    seeks.add(position);
    await pendingSeek?.future;
    return true;
  }
}

void main() {
  for (final language in ['ar', 'en']) {
    testWidgets(
        '$language episode seeking is accessible at 200 percent and commits once',
        (tester) async {
      final semantics = tester.ensureSemantics();
      try {
        final player = _Player();
        final events = StreamController<AudioPlaybackProgress>.broadcast();
        addTearDown(events.close);
        await tester.pumpWidget(ProviderScope(
            overrides: [
              stationPlayerControllerProvider.overrideWith((ref) => player),
              audioPlaybackProgressProvider
                  .overrideWith((ref) => events.stream),
            ],
            child: MaterialApp(
                locale: Locale(language),
                supportedLocales: AppLocalizations.supportedLocales,
                localizationsDelegates: AppLocalizations.localizationsDelegates,
                builder: (context, child) => MediaQuery(
                    data: MediaQuery.of(context)
                        .copyWith(textScaler: const TextScaler.linear(2)),
                    child: child!),
                home: Scaffold(
                    body: SizedBox(
                        width: 320,
                        child: EpisodeProgressControls(
                            episodeId: reviewEpisode.id))))));
        events.add(AudioPlaybackProgress(
            itemId: 'episode:${reviewEpisode.id}', isLive: false));
        await tester.pump();
        await tester.pump();
        expect(find.byType(Slider), findsNothing);
        events.add(AudioPlaybackProgress(
            itemId: 'episode:${reviewEpisode.id}',
            isLive: true,
            duration: const Duration(seconds: 60)));
        await tester.pump();
        await tester.pump();
        expect(find.byType(Slider), findsNothing);
        events.add(AudioPlaybackProgress(
            itemId: 'episode:${reviewEpisode.id}',
            isLive: false,
            position: const Duration(seconds: 12),
            duration: const Duration(seconds: 60)));
        await tester.pump();
        await tester.pump();
        expect(find.text('0:12 / 1:00'), findsOneWidget);
        final label = language == 'ar' ? 'تقدم الحلقة' : 'Episode progress';
        final progressSemantics = find.semantics.byLabel(label);
        expect(progressSemantics.evaluate().single.getSemanticsData().value,
            '0:12 / 1:00');
        tester.semantics.increase(progressSemantics);
        await tester.pumpAndSettle();
        expect(player.seeks, [const Duration(seconds: 15)]);
        tester.semantics.decrease(progressSemantics);
        await tester.pumpAndSettle();
        expect(player.seeks.last, const Duration(seconds: 9));
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.pumpAndSettle();
        await tester.sendKeyEvent(LogicalKeyboardKey.arrowUp);
        await tester.pumpAndSettle();
        expect(player.seeks.length, 3);
        expect(player.seeks.last, const Duration(seconds: 15));
        player.seeks.clear();
        final slider = tester.widget<Slider>(find.byType(Slider));
        expect(slider.semanticFormatterCallback!(12), '0:12 / 1:00');
        slider.onChangeStart!(15);
        slider.onChanged!(20);
        slider.onChanged!(30);
        await tester.pump();
        expect(player.seeks, isEmpty);
        tester.widget<Slider>(find.byType(Slider)).onChangeEnd!(30);
        await tester.pump();
        expect(player.seeks, [const Duration(seconds: 30)]);
        expect(tester.takeException(), isNull);
        events.add(const AudioPlaybackProgress(
            itemId: 'episode:old',
            isLive: false,
            duration: Duration(seconds: 60)));
        await tester.pump();
        await tester.pump();
        expect(find.byType(Slider), findsNothing);
        events.add(AudioPlaybackProgress(
            itemId: 'episode:${reviewEpisode.id}',
            isLive: false,
            position: const Duration(seconds: 12),
            seekFailed: true));
        await tester.pump();
        await tester.pump();
        expect(find.byType(Slider), findsNothing);
        expect(
            find.text(language == 'ar'
                ? 'التقديم غير متاح لهذه الحلقة'
                : 'Seeking is unavailable for this episode'),
            findsOneWidget);
        events.add(AudioPlaybackProgress(
            itemId: 'episode:${reviewEpisode.id}',
            isLive: false,
            duration: const Duration(seconds: 60)));
        await tester.pump();
        await tester.pump();
        player.pendingSeek = Completer<void>();
        tester.widget<Slider>(find.byType(Slider)).onChangeEnd!(20);
        await tester.pump();
        await tester.pumpWidget(const SizedBox());
        player.pendingSeek!.complete();
        await tester.pump();
        expect(tester.takeException(), isNull);
      } finally {
        semantics.dispose();
      }
    });
  }
}
