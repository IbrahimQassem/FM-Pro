import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/repositories/account_repository.dart';
import '../../domain/models/account_sign_in_provider.dart';
import 'account_state.dart';

class AccountController extends StateNotifier<AccountState> {
  AccountController(this._repository) : super(const AccountState()) {
    _subscription = _repository.watchAccount().listen(
      (user) {
        if (!mounted) return;
        state = state.copyWith(
          user: user,
          clearUser: user == null,
          isInitializing: false,
          isSubmitting: false,
          clearFailure: true,
        );
      },
      onError: (_) {
        if (mounted) {
          state = state.copyWith(
            isInitializing: false,
            isSubmitting: false,
            failure: AccountFailure.unavailable,
          );
        }
      },
    );
  }

  final AccountRepository _repository;
  late final StreamSubscription<Object?> _subscription;

  void setMode(AccountMode mode) {
    state = state.copyWith(
      mode: mode,
      clearFailure: true,
      passwordResetSent: false,
      accountDeleted: false,
      verificationCodeSent: false,
      providerLinked: false,
    );
  }

  Future<void> signIn({required String email, required String password}) async {
    await _run(() => _repository.signIn(email: email, password: password));
  }

  Future<void> register({
    required String displayName,
    required String email,
    required String password,
  }) async {
    final succeeded = await _run(
      () => _repository.register(
        displayName: displayName,
        email: email,
        password: password,
      ),
    );
    if (succeeded && mounted) {
      state = state.copyWith(verificationCodeSent: true);
    }
  }

  Future<void> requestEmailVerificationCode({String? email}) async {
    final succeeded = await _run(
      () => _repository.requestEmailVerificationCode(email: email),
    );
    if (succeeded && mounted) {
      state = state.copyWith(verificationCodeSent: true);
    }
  }

  Future<void> verifyEmailCode(String code) async {
    await _run(() => _repository.verifyEmailCode(code));
  }

  Future<void> continueWithProvider(AccountSignInProvider provider) async {
    final wasSignedIn = state.isSignedIn;
    final succeeded = await _run(
      () => _repository.continueWithProvider(provider),
    );
    if (succeeded && wasSignedIn && mounted) {
      state = state.copyWith(providerLinked: true);
    }
  }

  Future<void> sendPasswordReset(String email) async {
    state = state.copyWith(
      isSubmitting: true,
      clearFailure: true,
      passwordResetSent: false,
    );
    try {
      await _repository.sendPasswordReset(email);
      if (mounted) {
        state = state.copyWith(
          isSubmitting: false,
          passwordResetSent: true,
          clearFailure: true,
        );
      }
    } on AccountException catch (error) {
      if (mounted) {
        state = state.copyWith(isSubmitting: false, failure: error.failure);
      }
    } on Object {
      if (mounted) {
        state = state.copyWith(
          isSubmitting: false,
          failure: AccountFailure.unavailable,
        );
      }
    }
  }

  Future<void> signOut() async {
    await _run(_repository.signOut);
  }

  Future<bool> deleteAccount(String? currentPassword) async {
    state = state.copyWith(
      isSubmitting: true,
      clearFailure: true,
      passwordResetSent: false,
      accountDeleted: false,
    );
    try {
      await _repository.deleteAccount(currentPassword: currentPassword);
      if (mounted) {
        state = state.copyWith(
          isSubmitting: false,
          clearUser: true,
          clearFailure: true,
          accountDeleted: true,
        );
      }
      return true;
    } on AccountException catch (error) {
      if (mounted) {
        state = state.copyWith(isSubmitting: false, failure: error.failure);
      }
      return false;
    } on Object {
      if (mounted) {
        state = state.copyWith(
          isSubmitting: false,
          failure: AccountFailure.deletionFailed,
        );
      }
      return false;
    }
  }

  Future<bool> _run(Future<void> Function() action) async {
    state = state.copyWith(
      isSubmitting: true,
      clearFailure: true,
      passwordResetSent: false,
      accountDeleted: false,
      providerLinked: false,
    );
    try {
      await action();
      if (mounted) state = state.copyWith(isSubmitting: false);
      return true;
    } on AccountException catch (error) {
      if (mounted) {
        state = state.copyWith(isSubmitting: false, failure: error.failure);
      }
      return false;
    } on Object {
      if (mounted) {
        state = state.copyWith(
          isSubmitting: false,
          failure: AccountFailure.unavailable,
        );
      }
      return false;
    }
  }

  @override
  void dispose() {
    unawaited(_subscription.cancel());
    super.dispose();
  }
}
