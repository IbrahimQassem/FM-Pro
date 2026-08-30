import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/repositories/account_repository.dart';
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
    );
  }

  Future<void> signIn({required String email, required String password}) {
    return _run(() => _repository.signIn(email: email, password: password));
  }

  Future<void> register({
    required String displayName,
    required String email,
    required String password,
  }) {
    return _run(
      () => _repository.register(
        displayName: displayName,
        email: email,
        password: password,
      ),
    );
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

  Future<void> signOut() => _run(_repository.signOut);

  Future<void> _run(Future<void> Function() action) async {
    state = state.copyWith(
      isSubmitting: true,
      clearFailure: true,
      passwordResetSent: false,
    );
    try {
      await action();
      if (mounted) state = state.copyWith(isSubmitting: false);
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

  @override
  void dispose() {
    unawaited(_subscription.cancel());
    super.dispose();
  }
}
