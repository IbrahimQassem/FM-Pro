import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/home/domain/models/station.dart';
import 'package:hudhud_fm/features/player/presentation/controllers/station_player_state.dart';
import 'package:hudhud_fm/features/station_content/domain/models/episode.dart';
import 'package:hudhud_fm/features/station_content/domain/models/program_schedule.dart';
import 'package:hudhud_fm/features/station_content/domain/models/station_program.dart';
import 'package:hudhud_fm/features/station_content/presentation/program_details_screen.dart';
import 'package:hudhud_fm/l10n/generated/app_localizations.dart';

void main() {
  testWidgets('shows program details and forwards episode playback', (
    tester,
  ) async {
    final episode = _episode();
    Episode? selectedEpisode;
    await tester.pumpWidget(
      _TestApp(
        child: ProgramDetailsView(
          station: _station,
          program: _program,
          episodes: [episode],
          playerState: const StationPlayerState(),
          onEpisodePlayPressed: (value) => selectedEpisode = value,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('صباح اليمن'), findsWidgets);
    expect(find.text('حلقة التعليم'), findsOneWidget);
    await tester.tap(find.byKey(const Key('episode-play-episode-1')));
    expect(selectedEpisode?.id, 'episode-1');
  });

  testWidgets('remains usable on a small screen at 200% text scale', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(640, 1136);
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      _TestApp(
        textScaler: const TextScaler.linear(2),
        child: ProgramDetailsView(
          station: _station,
          program: _program,
          episodes: [_episode()],
          playerState: const StationPlayerState(),
          onEpisodePlayPressed: (_) {},
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    await tester.scrollUntilVisible(
      find.byKey(const Key('episode-play-episode-1')),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.byKey(const Key('episode-play-episode-1')), findsOneWidget);
  });
}

class _TestApp extends StatelessWidget {
  const _TestApp({required this.child, this.textScaler});

  final Widget child;
  final TextScaler? textScaler;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      locale: const Locale('ar'),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      builder: textScaler == null
          ? null
          : (context, child) => MediaQuery(
              data: MediaQuery.of(context).copyWith(textScaler: textScaler),
              child: child!,
            ),
      home: child,
    );
  }
}

Episode _episode() => Episode(
  id: 'episode-1',
  programId: 'morning',
  stationId: 'sanaa-radio',
  title: 'حلقة التعليم',
  description: 'حلقة عن التعليم ومستقبل الشباب.',
  audioUrl: 'https://audio.example.com/episode.mp3',
  durationSeconds: 1800,
  priority: 10,
  isPublished: true,
  isFeatured: false,
  broadcastAt: DateTime.utc(2026, 8, 29, 5),
  utcOffsetMinutes: 180,
  playsCount: 10,
  likesCount: 2,
  commentsCount: 1,
);

const _program = StationProgram(
  id: 'morning',
  stationId: 'sanaa-radio',
  title: 'صباح اليمن',
  description: 'برنامج صباحي يومي.',
  presenters: ['أحمد'],
  categories: ['مجتمعي'],
  priority: 10,
  isActive: true,
  isFeatured: true,
  schedule: ProgramSchedule(
    weekdays: [1, 2, 3, 4, 5, 6],
    startMinute: 480,
    endMinute: 600,
    utcOffsetMinutes: 180,
  ),
  episodesCount: 1,
  subscribersCount: 20,
  totalPlays: 100,
);

const _station = Station(
  id: 'sanaa-radio',
  name: 'إذاعة صنعاء',
  streamUrl: 'https://radio.example.com/live',
  countryCode: 'YE',
  countryNameAr: 'اليمن',
  cityCode: 'sanaa',
  cityNameAr: 'صنعاء',
  priority: 10,
  isLive: true,
  isActive: true,
  isVerified: true,
  isFeatured: true,
  programsCount: 1,
  subscribersCount: 20,
  totalPlays: 100,
);
