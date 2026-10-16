import 'station_program.dart';

/// Helper to resolve the currently broadcasting (or upcoming) program
/// mathematically on the client side according to Yemen timezone (UTC+3 / utcOffsetMinutes: 180)
/// without any backend polling or Firestore writes.
abstract final class NowPlayingResolver {
  /// Default offset for Yemen (Asia/Aden: UTC+3).
  static const int defaultUtcOffsetMinutes = 180;

  /// Returns the program currently broadcasting live, if any.
  ///
  /// Criteria:
  /// - `program.isActive == true`
  /// - `program.schedule != null`
  /// - `program.schedule.weekdays` contains the current day of the week in Yemen (1=Mon ... 7=Sun).
  /// - `currentMinute` in Yemen is within `[startMinute, endMinute)`.
  static StationProgram? resolveLiveProgram(
    List<StationProgram> programs, {
    DateTime? now,
    int utcOffsetMinutes = defaultUtcOffsetMinutes,
  }) {
    final current = now ?? DateTime.now();
    final yemenTime = current.toUtc().add(Duration(minutes: utcOffsetMinutes));
    final weekday = yemenTime.weekday;
    final currentMinute = yemenTime.hour * 60 + yemenTime.minute;

    for (final program in programs) {
      if (!program.isActive) continue;
      final schedule = program.schedule;
      if (schedule == null) continue;
      if (!schedule.includesWeekday(weekday)) continue;

      if (currentMinute >= schedule.startMinute &&
          currentMinute < schedule.endMinute) {
        return program;
      }
    }
    return null;
  }

  /// Returns the closest upcoming program on the same day within the next 3 hours (180 minutes).
  static StationProgram? resolveNextProgram(
    List<StationProgram> programs, {
    DateTime? now,
    int utcOffsetMinutes = defaultUtcOffsetMinutes,
  }) {
    final current = now ?? DateTime.now();
    final yemenTime = current.toUtc().add(Duration(minutes: utcOffsetMinutes));
    final weekday = yemenTime.weekday;
    final currentMinute = yemenTime.hour * 60 + yemenTime.minute;

    StationProgram? closestNext;
    int minDistance = 181;

    for (final program in programs) {
      if (!program.isActive) continue;
      final schedule = program.schedule;
      if (schedule == null) continue;
      if (!schedule.includesWeekday(weekday)) continue;

      if (schedule.startMinute > currentMinute) {
        final distance = schedule.startMinute - currentMinute;
        if (distance <= 180 && distance < minDistance) {
          minDistance = distance;
          closestNext = program;
        }
      }
    }
    return closestNext;
  }
}
