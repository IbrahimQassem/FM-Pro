import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../../domain/models/account_sign_in_provider.dart';
import '../../domain/models/account_user.dart';
import '../../domain/repositories/account_repository.dart';
import '../datasources/account_auth_data_source.dart';

class FirebaseAccountRepository implements AccountRepository {
  const FirebaseAccountRepository(this._dataSource);

  final AccountAuthDataSource _dataSource;

  @override
  Stream<AccountUser?> watchAccount() {
    return _dataSource.watchAccount().map((snapshot) {
      if (snapshot == null) return null;
      return AccountUser(
        uid: snapshot.uid,
        displayName: snapshot.displayName,
        email: snapshot.email,
        emailVerified: snapshot.emailVerified,
        linkedProviders: AccountSignInProvider.values
            .where(
              (provider) => snapshot.providerIds.contains(provider.firebaseId),
            )
            .toSet(),
      );
    });
  }

  @override
  Future<void> signIn({required String email, required String password}) {
    return _guard(() => _dataSource.signIn(email: email, password: password));
  }

  @override
  Future<void> register({
    required String displayName,
    required String email,
    required String password,
  }) {
    return _guard(
      () => _dataSource.register(
        displayName: displayName,
        email: email,
        password: password,
      ),
    );
  }

  @override
  Future<void> requestEmailVerificationCode({String? email}) {
    return _guard(() => _dataSource.requestEmailVerificationCode(email: email));
  }

  @override
  Future<void> verifyEmailCode(String code) {
    return _guard(() => _dataSource.verifyEmailCode(code));
  }

  @override
  Future<void> continueWithProvider(AccountSignInProvider provider) {
    return _guard(() => _dataSource.continueWithProvider(provider));
  }

  @override
  Future<void> sendPasswordReset(String email) {
    return _guard(() => _dataSource.sendPasswordReset(email));
  }

  @override
  Future<void> deleteAccount({String? currentPassword}) {
    return _guard(
      () => _dataSource.deleteAccount(currentPassword: currentPassword),
      deletion: true,
    );
  }

  @override
  Future<void> signOut() => _guard(_dataSource.signOut);

  static Future<void> _guard(
    Future<void> Function() action, {
    bool deletion = false,
  }) async {
    try {
      await action();
    } on AccountDataException catch (error) {
      throw AccountException(_mapDataFailure(error.code, deletion: deletion));
    } on FirebaseAuthException catch (error) {
      throw AccountException(_mapAuthFailure(error.code, deletion: deletion));
    } on FirebaseFunctionsException catch (error) {
      throw AccountException(
        _mapFunctionsFailure(error.code, deletion: deletion),
      );
    } on FirebaseException {
      throw const AccountException(AccountFailure.network);
    }
  }

  static AccountFailure _mapDataFailure(String code, {required bool deletion}) {
    return switch (code) {
      'provider-cancelled' => AccountFailure.providerCancelled,
      'provider-not-configured' ||
      'unsupported-provider' => AccountFailure.providerNotConfigured,
      'provider-credential-missing' ||
      'provider-failed' => AccountFailure.providerFailed,
      'reauthentication-required' => AccountFailure.reauthenticationFailed,
      'deletion-failed' => AccountFailure.deletionFailed,
      'verification-delivery-failed' =>
        AccountFailure.verificationDeliveryFailed,
      'invalid-verification-code' => AccountFailure.invalidVerificationCode,
      _ =>
        deletion ? AccountFailure.deletionFailed : AccountFailure.unavailable,
    };
  }

  static AccountFailure _mapAuthFailure(String code, {required bool deletion}) {
    if (deletion &&
        const {
          'wrong-password',
          'invalid-credential',
          'user-mismatch',
          'requires-recent-login',
        }.contains(code)) {
      return AccountFailure.reauthenticationFailed;
    }
    return switch (code) {
      'invalid-credential' ||
      'user-not-found' ||
      'wrong-password' => AccountFailure.invalidCredentials,
      'email-already-in-use' ||
      'credential-already-in-use' ||
      'account-exists-with-different-credential' =>
        AccountFailure.accountConflict,
      'provider-already-linked' => AccountFailure.providerAlreadyLinked,
      'weak-password' => AccountFailure.weakPassword,
      'invalid-email' => AccountFailure.invalidEmail,
      'network-request-failed' => AccountFailure.network,
      'web-context-cancelled' ||
      'popup-closed-by-user' => AccountFailure.providerCancelled,
      'operation-not-allowed' => AccountFailure.providerNotConfigured,
      _ =>
        deletion ? AccountFailure.deletionFailed : AccountFailure.unavailable,
    };
  }

  static AccountFailure _mapFunctionsFailure(
    String code, {
    required bool deletion,
  }) {
    if (deletion) {
      return code == 'failed-precondition'
          ? AccountFailure.reauthenticationFailed
          : code == 'unavailable'
          ? AccountFailure.network
          : AccountFailure.deletionFailed;
    }
    return switch (code) {
      'invalid-argument' => AccountFailure.invalidVerificationCode,
      'deadline-exceeded' => AccountFailure.expiredVerificationCode,
      'resource-exhausted' => AccountFailure.verificationRateLimited,
      'already-exists' => AccountFailure.emailAlreadyInUse,
      'unavailable' => AccountFailure.verificationDeliveryFailed,
      'failed-precondition' => AccountFailure.providerNotConfigured,
      _ => AccountFailure.unavailable,
    };
  }
}
