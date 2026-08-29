class AppUser {
  const AppUser({
    required this.displayName,
    required this.isGuest,
    this.uid = '',
    this.username = '',
    this.avatarUrl = '',
  });

  const AppUser.guest()
    : uid = '',
      displayName = '',
      username = '',
      avatarUrl = '',
      isGuest = true;

  final String uid;
  final String displayName;
  final String username;
  final String avatarUrl;
  final bool isGuest;
}
