import 'account_sign_in_provider.dart';

class AccountUser {
  const AccountUser({
    required this.uid,
    required this.displayName,
    required this.email,
    this.username = '',
    this.photoUrl,
    this.emailVerified = false,
    this.linkedProviders = const {},
  });

  final String uid;
  final String displayName;
  final String email;
  final String username;
  final String? photoUrl;
  final bool emailVerified;
  final Set<AccountSignInProvider> linkedProviders;

  bool get usesPassword =>
      linkedProviders.contains(AccountSignInProvider.password);
}
