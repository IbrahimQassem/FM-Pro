import '../models/account_user.dart';

abstract interface class AccountRepository {
  Stream<AccountUser?> watchAccount();

  Future<void> signIn({required String email, required String password});

  Future<void> register({
    required String displayName,
    required String email,
    required String password,
  });

  Future<void> sendPasswordReset(String email);

  Future<void> signOut();
}

enum AccountFailure {
  invalidCredentials,
  emailAlreadyInUse,
  weakPassword,
  invalidEmail,
  network,
  unavailable,
}

class AccountException implements Exception {
  const AccountException(this.failure);

  final AccountFailure failure;
}
