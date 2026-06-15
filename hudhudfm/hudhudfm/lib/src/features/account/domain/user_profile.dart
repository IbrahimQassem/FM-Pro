class UserProfile {
  const UserProfile({
    required this.userId,
    required this.name,
    required this.email,
    required this.mobile,
    required this.photoUrl,
    required this.nickName,
    required this.bio,
    required this.tag,
    required this.country,
    required this.city,
  });

  factory UserProfile.empty(String userId) {
    return UserProfile(
      userId: userId,
      name: '',
      email: '',
      mobile: '',
      photoUrl: '',
      nickName: '',
      bio: '',
      tag: '',
      country: '',
      city: '',
    );
  }

  factory UserProfile.fromMap(String userId, Map<String, Object?> map) {
    return UserProfile(
      userId: _stringValue(map['userId'], fallback: userId),
      name: _stringValue(map['name']),
      email: _stringValue(map['email']),
      mobile: _stringValue(map['mobile']),
      photoUrl: _stringValue(map['photoUrl']),
      nickName: _stringValue(map['nickNme']),
      bio: _stringValue(map['bio']),
      tag: _stringValue(map['tag']),
      country: _stringValue(map['country']),
      city: _stringValue(map['city']),
    );
  }

  final String userId;
  final String name;
  final String email;
  final String mobile;
  final String photoUrl;
  final String nickName;
  final String bio;
  final String tag;
  final String country;
  final String city;

  Map<String, Object?> toSafeMap() {
    return {
      'userId': userId,
      'name': name,
      'email': email,
      'mobile': mobile,
      'photoUrl': photoUrl,
      'nickNme': nickName,
      'bio': bio,
      'tag': tag,
      'country': country,
      'city': city,
    };
  }
}

String _stringValue(Object? value, {String fallback = ''}) {
  final text = value?.toString();
  if (text == null || text.isEmpty) {
    return fallback;
  }

  return text;
}
