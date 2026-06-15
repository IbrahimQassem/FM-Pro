import 'date_time_model.dart';

class Episode {
  const Episode({
    required this.episodeId,
    required this.programId,
    required this.radioId,
    required this.name,
    required this.description,
    required this.announcer,
    required this.profileUrl,
    required this.streamUrl,
    required this.programName,
    required this.disabled,
    required this.schedule,
  });

  factory Episode.fromMap(Map<String, Object?> map) {
    return Episode(
      episodeId: _stringValue(map['epId']),
      programId: _stringValue(map['programId']),
      radioId: _stringValue(map['radioId']),
      name: _stringValue(map['epName']),
      description: _stringValue(map['epDesc']),
      announcer: _stringValue(map['epAnnouncer']),
      profileUrl: _stringValue(map['epProfile']),
      streamUrl: _stringValue(map['epStreamUrl']),
      programName: _stringValue(map['programName']),
      disabled: _boolValue(map['disabled']),
      schedule: _scheduleValue(map['programScheduleTime']),
    );
  }

  final String episodeId;
  final String programId;
  final String radioId;
  final String name;
  final String description;
  final String announcer;
  final String profileUrl;
  final String streamUrl;
  final String programName;
  final bool disabled;
  final List<DateTimeModel> schedule;

  bool get isVisible => !disabled;

  Map<String, Object?> toMap() {
    return {
      'epId': episodeId,
      'programId': programId,
      'radioId': radioId,
      'epName': name,
      'epDesc': description,
      'epAnnouncer': announcer,
      'epProfile': profileUrl,
      'epStreamUrl': streamUrl,
      'programName': programName,
      'disabled': disabled,
      'programScheduleTime': schedule.map((item) => item.toMap()).toList(),
    };
  }
}

String _stringValue(Object? value) => value?.toString() ?? '';

bool _boolValue(Object? value) {
  if (value is bool) {
    return value;
  }

  return value?.toString().toLowerCase() == 'true';
}

List<DateTimeModel> _scheduleValue(Object? value) {
  if (value is! Iterable) {
    return const [];
  }

  return value
      .whereType<Map>()
      .map(
        (item) => DateTimeModel.fromMap(
          item.map((key, value) => MapEntry(key.toString(), value)),
        ),
      )
      .toList(growable: false);
}
