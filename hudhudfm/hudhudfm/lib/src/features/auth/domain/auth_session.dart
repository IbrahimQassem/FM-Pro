class AuthSession {
  const AuthSession({
    required this.userId,
    required this.isAnonymous,
    this.displayName,
    this.email,
    this.phoneNumber,
    this.photoUrl,
  });

  final String userId;
  final String? displayName;
  final String? email;
  final String? phoneNumber;
  final String? photoUrl;
  final bool isAnonymous;
}
