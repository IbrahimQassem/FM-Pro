class DateTimeModel {
  const DateTimeModel({
    required this.dateStart,
    required this.dateEnd,
    required this.timeStart,
    required this.timeEnd,
    required this.weekdays,
    required this.asMainTime,
  });

  factory DateTimeModel.fromMap(Map<String, Object?> map) {
    return DateTimeModel(
      dateStart: _stringValue(map['dateStart']),
      dateEnd: _stringValue(map['dateEnd']),
      timeStart: _stringValue(map['timeStart']),
      timeEnd: _stringValue(map['timeEnd']),
      weekdays: _stringListValue(map['weekdays']),
      asMainTime: _boolValue(map['asMainTime']),
    );
  }

  final String dateStart;
  final String dateEnd;
  final String timeStart;
  final String timeEnd;
  final List<String> weekdays;
  final bool asMainTime;

  Map<String, Object?> toMap() {
    return {
      'dateStart': dateStart,
      'dateEnd': dateEnd,
      'timeStart': timeStart,
      'timeEnd': timeEnd,
      'weekdays': weekdays,
      'asMainTime': asMainTime,
    };
  }
}

String _stringValue(Object? value) => value?.toString() ?? '';

List<String> _stringListValue(Object? value) {
  if (value is Iterable) {
    return value.map((item) => item.toString()).toList(growable: false);
  }

  return const [];
}

bool _boolValue(Object? value) {
  if (value is bool) {
    return value;
  }

  return value?.toString().toLowerCase() == 'true';
}
