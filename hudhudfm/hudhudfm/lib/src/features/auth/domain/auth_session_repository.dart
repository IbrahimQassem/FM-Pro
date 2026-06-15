import 'auth_session.dart';

class AccountDeletionRequiresRecentLogin implements Exception {
  const AccountDeletionRequiresRecentLogin();

  @override
  String toString() => 'AccountDeletionRequiresRecentLogin';
}

class EmailAuthFailure implements Exception {
  const EmailAuthFailure(this.code);

  final String code;

  @override
  String toString() => 'EmailAuthFailure: $code';
}

abstract class AuthSessionRepository {
  Future<AuthSession> ensureAnonymousSession();

  Future<AuthSession?> currentSession();

  Future<AuthSession> signInWithEmail({
    required String email,
    required String password,
  });

  Future<AuthSession> registerWithEmail({
    required String email,
    required String password,
  });

  Future<void> signOut();

  Future<void> deleteCurrentAccount();
}
