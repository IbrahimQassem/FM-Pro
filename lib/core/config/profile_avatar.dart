/// Portable profile images accepted by the application and profile backend.
abstract final class ProfileAvatar {
  static const assets = <String>[
    'assets/images/mascot/mascot_avatar_default.webp',
    'assets/images/mascot/mascot_onboarding.webp',
    'assets/images/mascot/mascot_empty_favorites.webp',
    'assets/images/mascot/mascot_empty_comments.webp',
  ];

  static String sanitize(Object? value) {
    if (value is! String) return '';
    final text = value.trim();
    if (assets.contains(text)) return text;
    final uri = Uri.tryParse(text);
    return uri != null &&
            uri.scheme == 'https' &&
            uri.host.isNotEmpty &&
            uri.userInfo.isEmpty
        ? text
        : '';
  }
}
