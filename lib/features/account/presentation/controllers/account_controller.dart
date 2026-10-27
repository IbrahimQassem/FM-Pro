import 'dart:typed_data';
import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/repositories/account_repository.dart';
import '../../domain/models/account_sign_in_provider.dart';
import '../../domain/models/account_registration_result.dart';
import 'account_state.dart';

class AccountController extends StateNotifier<AccountState> {
  AccountController(this._repository) : super(const AccountState()) {
    _subscription = _repository.watchAccount().listen(
      (user) {
        if (!mounted) return;
        final identityChanged = state.user?.uid != user?.uid;
        final deliveryFailure =
            state.failure == AccountFailure.verificationDeliveryFailed ||
                state.failure == AccountFailure.verificationRateLimited;
        final registrationIdentity = identityChanged &&
            (_registrationPending || _registrationCreated) &&
            _registrationUid == null &&
            state.user == null &&
            user != null;
        if (identityChanged) {
          if (registrationIdentity) {
            // Account creation's own first Auth event belongs to this request.
            _registrationUid = user.uid;
          } else {
            _verificationEpoch++;
            _registrationCreated = false;
          }
        }
        state = state.copyWith(
          user: user,
          clearUser: user == null,
          isInitializing: false,
          isSubmitting: _registrationPending || _verificationPending,
          clearFailure: (identityChanged || !deliveryFailure) &&
              !registrationIdentity &&
              !_registrationPending &&
              !_verificationPending,
          verificationCodeSent:
              identityChanged && !registrationIdentity ? false : null,
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
  bool _registrationPending = false;
  bool _verificationPending = false;
  bool _registrationCreated = false;
  String? _registrationUid;
  int _verificationEpoch = 0;

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

  Future<bool> updateProfile({
    required String displayName,
    String? photoUrl,
    Uint8List? photoBytes,
  }) async {
    return _run(
      () => _repository.updateProfile(
        displayName: displayName,
        photoUrl: photoUrl,
        photoBytes: photoBytes,
      ),
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
    if (state.isSubmitting ||
        _registrationPending ||
        _verificationPending ||
        state.user != null ||
        _registrationCreated) {
      return;
    }
    _registrationPending = true;
    _registrationUid = null;
    final epoch = _verificationEpoch;
    state = state.copyWith(
        isSubmitting: true, clearFailure: true, verificationCodeSent: false);
    try {
      final result = await _repository.register(
        displayName: displayName,
        email: email,
        password: password,
      );
      if (!mounted || epoch != _verificationEpoch) return;
      _registrationCreated = true;
      final delivery = result.verificationDelivery;
      state = state.copyWith(
        verificationCodeSent: delivery == AccountVerificationDelivery.sent,
        clearFailure: delivery == AccountVerificationDelivery.sent,
        failure: delivery == AccountVerificationDelivery.rateLimited
            ? AccountFailure.verificationRateLimited
            : delivery == AccountVerificationDelivery.failed
                ? AccountFailure.verificationDeliveryFailed
                : null,
      );
    } on AccountException catch (error) {
      if (mounted && epoch == _verificationEpoch) {
        state = state.copyWith(failure: error.failure);
      }
    } on Object {
      if (mounted && epoch == _verificationEpoch) {
        state = state.copyWith(failure: AccountFailure.unavailable);
      }
    } finally {
      _registrationPending = false;
      if (mounted) state = state.copyWith(isSubmitting: false);
    }
  }

  Future<void> requestEmailVerificationCode({String? email}) async {
    if (state.isSubmitting || _registrationPending || _verificationPending) {
      return;
    }
    _verificationPending = true;
    final epoch = _verificationEpoch;
    state = state.copyWith(
        isSubmitting: true, clearFailure: true, verificationCodeSent: false);
    try {
      await _repository.requestEmailVerificationCode(email: email);
      if (mounted && epoch == _verificationEpoch) {
        state = state.copyWith(verificationCodeSent: true, clearFailure: true);
      }
    } on AccountException catch (error) {
      if (mounted && epoch == _verificationEpoch) {
        state = state.copyWith(failure: error.failure);
      }
    } on Object {
      if (mounted && epoch == _verificationEpoch) {
        state =
            state.copyWith(failure: AccountFailure.verificationDeliveryFailed);
      }
    } finally {
      _verificationPending = false;
      if (mounted) state = state.copyWith(isSubmitting: false);
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
