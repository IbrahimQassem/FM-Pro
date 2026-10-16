import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/station_content/domain/models/now_playing_resolver.dart';
import 'package:hudhud_fm/features/station_content/domain/models/program_schedule.dart';
import 'package:hudhud_fm/features/station_content/domain/models/station_program.dart';

void main() {
  group('NowPlayingResolver', () {
    const morningProgram = StationProgram(
      id: 'morning_show',
      stationId: 'station_1',
      title: 'صباح الخير يا يمن',
      priority: 10,
      isActive: true,
      isFeatured: false,
      episodesCount: 5,
      subscribersCount: 20,
      totalPlays: 100,
      schedule: ProgramSchedule(
        weekdays: [1, 2, 3, 4, 5], // Mon-Fri
        startMinute: 360, // 06:00
        endMinute: 480, // 08:00
        utcOffsetMinutes: 180,
      ),
    );

    const eveningProgram = StationProgram(
      id: 'evening_news',
      stationId: 'station_1',
      title: 'حصاد المساء',
      priority: 5,
      isActive: true,
      isFeatured: false,
      episodesCount: 12,
      subscribersCount: 40,
      totalPlays: 300,
      schedule: ProgramSchedule(
        weekdays: [1, 2, 3, 4, 5, 6, 7], // All week
        startMinute: 1080, // 18:00
        endMinute: 1140, // 19:00
        utcOffsetMinutes: 180,
      ),
    );

    const inactiveProgram = StationProgram(
      id: 'inactive_show',
      stationId: 'station_1',
      title: 'برنامج متوقف',
      priority: 1,
      isActive: false,
      isFeatured: false,
      episodesCount: 0,
      subscribersCount: 0,
      totalPlays: 0,
      schedule: ProgramSchedule(
        weekdays: [1, 2, 3, 4, 5, 6, 7],
        startMinute: 360,
        endMinute: 480,
        utcOffsetMinutes: 180,
      ),
    );

    final programs = [morningProgram, eveningProgram, inactiveProgram];

    test('resolves live program when current Yemen time is within schedule', () {
      // Monday (2026-10-19): 04:00 UTC = 07:00 Yemen time (minute 420, between 360 and 480)
      final testTime = DateTime.utc(2026, 10, 19, 4, 0);
      final live = NowPlayingResolver.resolveLiveProgram(programs, now: testTime);

      expect(live, isNotNull);
      expect(live?.id, equals('morning_show'));
      expect(live?.title, equals('صباح الخير يا يمن'));
    });

    test('returns null when no program is scheduled for current minute', () {
      // Monday: 09:00 UTC = 12:00 Yemen time (minute 720)
      final testTime = DateTime.utc(2026, 10, 19, 9, 0);
      final live = NowPlayingResolver.resolveLiveProgram(programs, now: testTime);

      expect(live, isNull);
    });

    test('ignores inactive programs even if within schedule window', () {
      final testTime = DateTime.utc(2026, 10, 19, 4, 0);
      final live = NowPlayingResolver.resolveLiveProgram([inactiveProgram], now: testTime);

      expect(live, isNull);
    });

    test('respects weekdays list (skips program on weekend)', () {
      // Sunday (2026-10-18): 04:00 UTC = 07:00 Yemen time
      // morningProgram does NOT include weekday 7 (Sunday)
      final testTime = DateTime.utc(2026, 10, 18, 4, 0);
      final live = NowPlayingResolver.resolveLiveProgram(programs, now: testTime);

      expect(live, isNull);
    });

    test('resolves next program within 3 hour window', () {
      // Monday: 13:30 UTC = 16:30 Yemen time (minute 990). Evening program starts at 1080 (18:00) -> 90 mins away
      final testTime = DateTime.utc(2026, 10, 19, 13, 30);
      final next = NowPlayingResolver.resolveNextProgram(programs, now: testTime);

      expect(next, isNotNull);
      expect(next?.id, equals('evening_news'));
    });

    test('ignores next program if more than 3 hours away', () {
      // Monday: 07:00 UTC = 10:00 Yemen time (minute 600). Evening program starts at 1080 -> 480 mins away (>180)
      final testTime = DateTime.utc(2026, 10, 19, 7, 0);
      final next = NowPlayingResolver.resolveNextProgram(programs, now: testTime);

      expect(next, isNull);
    });
  });
}
