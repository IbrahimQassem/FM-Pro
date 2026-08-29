import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/station_content/domain/models/program_schedule.dart';

void main() {
  const schedule = ProgramSchedule(
    weekdays: [DateTime.saturday],
    startMinute: 8 * 60,
    endMinute: 10 * 60,
    utcOffsetMinutes: 180,
  );

  test('reports live during the active Aden time slot', () {
    final now = DateTime.utc(2026, 8, 29, 6);

    expect(schedule.statusAt(now, DateTime.saturday), ScheduleSlotStatus.live);
  });

  test('reports next within three hours and upcoming before that', () {
    expect(
      schedule.statusAt(DateTime.utc(2026, 8, 29, 3), DateTime.saturday),
      ScheduleSlotStatus.next,
    );
    expect(
      schedule.statusAt(DateTime.utc(2026, 8, 28, 22), DateTime.saturday),
      ScheduleSlotStatus.upcoming,
    );
  });

  test('does not mark a slot live for a different selected weekday', () {
    expect(
      schedule.statusAt(DateTime.utc(2026, 8, 29, 6), DateTime.sunday),
      ScheduleSlotStatus.upcoming,
    );
  });
}
