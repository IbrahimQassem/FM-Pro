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

  Future<void> deleteAccount({required String currentPassword});

  Future<void> signOut();
}

enum AccountFailure {
  invalidCredentials,
  emailAlreadyInUse,
  weakPassword,
  invalidEmail,
  network,
  reauthenticationFailed,
  deletionFailed,
  unavailable,
}

class AccountException implements Exception {
  const AccountException(this.failure);

  final AccountFailure failure;
}
