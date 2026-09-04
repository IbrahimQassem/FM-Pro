import '../models/account_user.dart';
import '../models/account_sign_in_provider.dart';

abstract interface class AccountRepository {
  Stream<AccountUser?> watchAccount();

  Future<void> signIn({required String email, required String password});

  Future<void> register({
    required String displayName,
    required String email,
    required String password,
  });

  Future<void> updateProfile({
    required String displayName,
    String? photoUrl,
  });

  Future<void> requestEmailVerificationCode({String? email});

  Future<void> verifyEmailCode(String code);

  Future<void> continueWithProvider(AccountSignInProvider provider);

  Future<void> sendPasswordReset(String email);

  Future<void> deleteAccount({String? currentPassword});

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
  invalidVerificationCode,
  expiredVerificationCode,
  verificationRateLimited,
  verificationDeliveryFailed,
  providerCancelled,
  providerFailed,
  providerNotConfigured,
  providerAlreadyLinked,
  accountConflict,
  unavailable,
}

class AccountException implements Exception {
  const AccountException(this.failure);

  final AccountFailure failure;
}
