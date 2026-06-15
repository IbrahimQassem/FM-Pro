class RadioProgram {
  const RadioProgram({
    required this.programId,
    required this.radioId,
    required this.name,
    required this.description,
    required this.profileUrl,
    required this.disabled,
    required this.createdBy,
    this.tag = '',
    this.categoryList = const [],
  });

  factory RadioProgram.fromMap(Map<String, Object?> map) {
    return RadioProgram(
      programId: _stringValue(map['programId']),
      radioId: _stringValue(map['radioId']),
      name: _stringValue(map['prName']),
      description: _stringValue(map['prDesc']),
      profileUrl: _stringValue(map['prProfile']),
      disabled: _boolValue(map['disabled']),
      createdBy: _stringValue(map['createBy']),
      tag: _stringValue(map['prTag']),
      categoryList: _stringListValue(map['prCategoryList']),
    );
  }

  final String programId;
  final String radioId;
  final String name;
  final String description;
  final String profileUrl;
  final bool disabled;
  final String createdBy;
  final String tag;
  final List<String> categoryList;

  bool get isVisible => !disabled;

  Map<String, Object?> toMap() {
    return {
      'programId': programId,
      'radioId': radioId,
      'prName': name,
      'prDesc': description,
      'prProfile': profileUrl,
      'disabled': disabled,
      'createBy': createdBy,
      'prTag': tag,
      'prCategoryList': categoryList,
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
