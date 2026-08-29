import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/home/domain/models/station.dart';
import 'package:hudhud_fm/features/player/presentation/controllers/station_player_state.dart';
import 'package:hudhud_fm/features/station_details/presentation/station_details_screen.dart';
import 'package:hudhud_fm/features/station_content/domain/models/program_schedule.dart';
import 'package:hudhud_fm/features/station_content/domain/models/station_program.dart';
import 'package:hudhud_fm/features/station_content/presentation/controllers/station_content_state.dart';
import 'package:hudhud_fm/l10n/generated/app_localizations.dart';

void main() {
  testWidgets('shows station details and forwards the playback action', (
    tester,
  ) async {
    var playPressed = false;

    await tester.pumpWidget(
      _TestApp(
        child: StationDetailsView(
          station: _station,
          playbackStatus: StationPlaybackStatus.idle,
          onPlayPressed: () => playPressed = true,
          onStopPressed: () {},
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('إذاعة صنعاء'), findsWidgets);
    expect(find.text('صنعاء، اليمن'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('عن الإذاعة'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('عن الإذاعة'), findsOneWidget);

    await tester.tap(find.byKey(const Key('station-playback-button')));
    expect(playPressed, isTrue);
  });

  testWidgets('shows a recoverable playback failure', (tester) async {
    await tester.pumpWidget(
      _TestApp(
        child: StationDetailsView(
          station: _station,
          playbackStatus: StationPlaybackStatus.failure,
          onPlayPressed: () {},
          onStopPressed: () {},
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.text('تعذر الاتصال ببث الإذاعة. تحقق من اتصالك أو حاول مرة أخرى.'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('إعادة محاولة التشغيل'), findsOneWidget);
    expect(
      find.text('تعذر الاتصال ببث الإذاعة. تحقق من اتصالك أو حاول مرة أخرى.'),
      findsOneWidget,
    );
  });

  testWidgets('shows programs and the weekly schedule', (tester) async {
    StationProgram? selectedProgram;
    await tester.pumpWidget(
      _TestApp(
        child: StationDetailsView(
          station: _station,
          playbackStatus: StationPlaybackStatus.idle,
          onPlayPressed: () {},
          onStopPressed: () {},
          contentState: const StationContentState(
            isInitialLoading: false,
            programs: [_program],
          ),
          onProgramPressed: (program) => selectedProgram = program,
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(Tab, 'برامج'));
    await tester.pumpAndSettle();
    expect(find.text('صباح اليمن'), findsOneWidget);
    await tester.tap(find.text('صباح اليمن'));
    expect(selectedProgram?.id, 'morning');

    await tester.tap(find.widgetWithText(Tab, 'الجدول'));
    await tester.pumpAndSettle();
    expect(find.text('صباح اليمن'), findsOneWidget);
  });
}

class _TestApp extends StatelessWidget {
  const _TestApp({required this.child});

  final Widget child;

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
      home: child,
    );
  }
}

const _station = Station(
  id: 'sanaa-radio',
  name: 'إذاعة صنعاء',
  description: 'إذاعة محلية من العاصمة صنعاء.',
  streamUrl: 'https://radio.example.com/live',
  countryCode: 'YE',
  countryNameAr: 'اليمن',
  cityCode: 'sanaa',
  cityNameAr: 'صنعاء',
  frequency: '92.5 FM',
  priority: 10,
  isLive: true,
  isActive: true,
  isVerified: true,
  isFeatured: true,
  programsCount: 4,
  subscribersCount: 120,
  totalPlays: 400,
);

const _program = StationProgram(
  id: 'morning',
  stationId: 'sanaa-radio',
  title: 'صباح اليمن',
  priority: 10,
  isActive: true,
  isFeatured: true,
  schedule: ProgramSchedule(
    weekdays: [1, 2, 3, 4, 5, 6, 7],
    startMinute: 480,
    endMinute: 600,
    utcOffsetMinutes: 180,
  ),
  episodesCount: 1,
  subscribersCount: 2,
  totalPlays: 3,
);
