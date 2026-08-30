class AccountUser {
  const AccountUser({
    required this.uid,
    required this.displayName,
    required this.email,
    this.username = '',
  });

  final String uid;
  final String displayName;
  final String email;
  final String username;
}
