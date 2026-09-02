import '../../domain/models/account_user.dart';
import '../../domain/repositories/account_repository.dart';

enum AccountMode { signIn, register }

class AccountState {
  const AccountState({
    this.user,
    this.mode = AccountMode.signIn,
    this.isInitializing = true,
    this.isSubmitting = false,
    this.failure,
    this.passwordResetSent = false,
    this.accountDeleted = false,
  });

  final AccountUser? user;
  final AccountMode mode;
  final bool isInitializing;
  final bool isSubmitting;
  final AccountFailure? failure;
  final bool passwordResetSent;
  final bool accountDeleted;

  bool get isSignedIn => user != null;

  AccountState copyWith({
    AccountUser? user,
    bool clearUser = false,
    AccountMode? mode,
    bool? isInitializing,
    bool? isSubmitting,
    AccountFailure? failure,
    bool clearFailure = false,
    bool? passwordResetSent,
    bool? accountDeleted,
  }) {
    return AccountState(
      user: clearUser ? null : user ?? this.user,
      mode: mode ?? this.mode,
      isInitializing: isInitializing ?? this.isInitializing,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      failure: clearFailure ? null : failure ?? this.failure,
      passwordResetSent: passwordResetSent ?? this.passwordResetSent,
      accountDeleted: accountDeleted ?? this.accountDeleted,
    );
  }
}
