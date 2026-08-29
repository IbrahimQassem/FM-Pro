enum ScheduleSlotStatus { live, next, upcoming, ended }

class ProgramSchedule {
  const ProgramSchedule({
    required this.weekdays,
    required this.startMinute,
    required this.endMinute,
    required this.utcOffsetMinutes,
  });

  final List<int> weekdays;
  final int startMinute;
  final int endMinute;
  final int utcOffsetMinutes;

  bool includesWeekday(int weekday) => weekdays.contains(weekday);

  ScheduleSlotStatus statusAt(DateTime now, int selectedWeekday) {
    final localNow = now.toUtc().add(Duration(minutes: utcOffsetMinutes));
    if (selectedWeekday != localNow.weekday) {
      return ScheduleSlotStatus.upcoming;
    }

    final currentMinute = localNow.hour * 60 + localNow.minute;
    if (currentMinute >= startMinute && currentMinute < endMinute) {
      return ScheduleSlotStatus.live;
    }
    if (currentMinute < startMinute) {
      return startMinute - currentMinute <= 180
          ? ScheduleSlotStatus.next
          : ScheduleSlotStatus.upcoming;
    }
    return ScheduleSlotStatus.ended;
  }
}
