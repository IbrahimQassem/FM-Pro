class RadioInfo {
  const RadioInfo({
    required this.id,
    required this.radioId,
    required this.name,
    required this.description,
    required this.streamUrl,
    required this.logoUrl,
    required this.city,
    required this.channelFrequency,
    required this.priority,
    required this.disabled,
    this.tag = '',
    this.englishName = '',
    this.createdBy = '',
  });

  factory RadioInfo.fromMap(Map<String, Object?> map) {
    final radioId = _stringValue(map['radioId']);

    return RadioInfo(
      id: _stringValue(map['id'], fallback: radioId),
      radioId: radioId,
      name: _stringValue(map['name']),
      description: _stringValue(map['desc']),
      streamUrl: _stringValue(map['streamUrl']),
      logoUrl: _stringValue(map['logo']),
      city: _stringValue(map['city']),
      channelFrequency: _stringValue(map['channelFreq']),
      priority: _intValue(map['priority']),
      disabled: _boolValue(map['disabled']),
      tag: _stringValue(map['tag']),
      englishName: _stringValue(map['enName']),
      createdBy: _stringValue(map['createBy']),
    );
  }

  final String id;
  final String radioId;
  final String name;
  final String description;
  final String streamUrl;
  final String logoUrl;
  final String city;
  final String channelFrequency;
  final int priority;
  final bool disabled;
  final String tag;
  final String englishName;
  final String createdBy;

  bool get canPlay => !disabled && streamUrl.trim().isNotEmpty;

  Map<String, Object?> toMap() {
    return {
      'id': id,
      'radioId': radioId,
      'name': name,
      'desc': description,
      'streamUrl': streamUrl,
      'logo': logoUrl,
      'city': city,
      'channelFreq': channelFrequency,
      'priority': priority,
      'disabled': disabled,
      'tag': tag,
      'enName': englishName,
      'createBy': createdBy,
    };
  }
}

String _stringValue(Object? value, {String fallback = ''}) {
  if (value == null) {
    return fallback;
  }

  return value.toString();
}

int _intValue(Object? value) {
  if (value is int) {
    return value;
  }

  if (value is num) {
    return value.toInt();
  }

  return int.tryParse(value?.toString() ?? '') ?? 0;
}

bool _boolValue(Object? value) {
  if (value is bool) {
    return value;
  }

  return value?.toString().toLowerCase() == 'true';
}
