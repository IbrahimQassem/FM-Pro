import '../../../../core/error/app_data_exception.dart';
import '../../domain/models/program_schedule.dart';
import '../../domain/models/station_program.dart';

abstract final class ProgramMapper {
  static StationProgram fromMap({
    required String id,
    required Map<String, dynamic> data,
  }) {
    if (id.trim().isEmpty) {
      throw const SchemaDataException('Program document ID is invalid.');
    }
    final scheduleData = data['schedule'];
    final stats = data['stats'];
    if (scheduleData != null && scheduleData is! Map<String, dynamic>) {
      throw const SchemaDataException('Program schedule is invalid.');
    }
    if (stats is! Map<String, dynamic>) {
      throw const SchemaDataException('Program stats are invalid.');
    }

    return StationProgram(
      id: id.trim(),
      stationId: _requiredString(data, 'stationId'),
      title: _requiredString(data, 'title'),
      titleEn: _optionalString(data, 'titleEn'),
      description: _optionalString(data, 'description'),
      coverUrl: _optionalHttpsUrl(data, 'coverUrl'),
      thumbnailUrl: _optionalHttpsUrl(data, 'thumbnailUrl'),
      categories: _stringList(data, 'categories'),
      presenters: _stringList(data, 'presenters'),
      priority: _requiredInt(data, 'priority'),
      isActive: _requiredBool(data, 'isActive'),
      isFeatured: _requiredBool(data, 'isFeatured'),
      schedule: scheduleData == null ? null : _schedule(scheduleData),
      episodesCount: _nonNegativeStat(stats, 'episodesCount'),
      subscribersCount: _nonNegativeStat(stats, 'subscribersCount'),
      totalPlays: _nonNegativeStat(stats, 'totalPlays'),
    );
  }

  static ProgramSchedule _schedule(Map<String, dynamic> data) {
    final weekdays = _intList(data, 'weekdays');
    final startMinute = _requiredInt(data, 'startMinute');
    final endMinute = _requiredInt(data, 'endMinute');
    final utcOffsetMinutes = _requiredInt(data, 'utcOffsetMinutes');
    final isValid =
        weekdays.isNotEmpty &&
        weekdays.every(
          (day) => day >= DateTime.monday && day <= DateTime.sunday,
        ) &&
        startMinute >= 0 &&
        startMinute < 1440 &&
        endMinute > startMinute &&
        endMinute <= 1440 &&
        utcOffsetMinutes >= -720 &&
        utcOffsetMinutes <= 840;
    if (!isValid) {
      throw const SchemaDataException('Program schedule values are invalid.');
    }
    return ProgramSchedule(
      weekdays: List.unmodifiable(weekdays.toSet()),
      startMinute: startMinute,
      endMinute: endMinute,
      utcOffsetMinutes: utcOffsetMinutes,
    );
  }

  static String _requiredString(Map<String, dynamic> data, String key) {
    final value = data[key];
    if (value is! String || value.trim().isEmpty) {
      throw SchemaDataException('Required program field is invalid: $key.');
    }
    return value.trim();
  }

  static String _optionalString(Map<String, dynamic> data, String key) {
    final value = data[key];
    if (value == null) return '';
    if (value is! String) {
      throw SchemaDataException('Optional program field is invalid: $key.');
    }
    return value.trim();
  }

  static String _optionalHttpsUrl(Map<String, dynamic> data, String key) {
    final value = _optionalString(data, key);
    if (value.isEmpty) return value;
    final uri = Uri.tryParse(value);
    if (uri == null || uri.scheme != 'https' || !uri.hasAuthority) {
      throw SchemaDataException('Program image URL is invalid: $key.');
    }
    return value;
  }

  static bool _requiredBool(Map<String, dynamic> data, String key) {
    final value = data[key];
    if (value is! bool) {
      throw SchemaDataException('Required program flag is invalid: $key.');
    }
    return value;
  }

  static int _requiredInt(Map<String, dynamic> data, String key) {
    final value = data[key];
    if (value is! num) {
      throw SchemaDataException('Required program number is invalid: $key.');
    }
    return value.toInt();
  }

  static int _nonNegativeStat(Map<String, dynamic> data, String key) {
    final value = data[key];
    if (value is! num || value < 0) {
      throw SchemaDataException('Program stat is invalid: $key.');
    }
    return value.toInt();
  }

  static List<String> _stringList(Map<String, dynamic> data, String key) {
    final value = data[key];
    if (value == null) return const [];
    if (value is! List ||
        value.any((item) => item is! String || item.trim().isEmpty)) {
      throw SchemaDataException('Program string list is invalid: $key.');
    }
    return List.unmodifiable(value.cast<String>().map((item) => item.trim()));
  }

  static List<int> _intList(Map<String, dynamic> data, String key) {
    final value = data[key];
    if (value is! List || value.any((item) => item is! num)) {
      throw SchemaDataException('Program number list is invalid: $key.');
    }
    return value.cast<num>().map((item) => item.toInt()).toList();
  }
}
