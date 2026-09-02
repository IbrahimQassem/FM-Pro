import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/account/domain/models/account_user.dart';
import 'package:hudhud_fm/features/account/domain/models/account_sign_in_provider.dart';
import 'package:hudhud_fm/features/account/domain/repositories/account_repository.dart';
import 'package:hudhud_fm/features/account/presentation/controllers/account_controller.dart';

void main() {
  test('tracks auth changes and delegates register and logout', () async {
    final repository = _FakeAccountRepository();
    final controller = AccountController(repository);
    addTearDown(controller.dispose);
    addTearDown(repository.dispose);

    repository.emit(_user);
    await Future<void>.delayed(Duration.zero);
    expect(controller.state.user?.uid, 'user-1');
    expect(controller.state.isInitializing, isFalse);

    await controller.register(
      displayName: 'Listener',
      email: 'listener@example.com',
      password: 'password123',
    );
    expect(repository.didRegister, isTrue);

    await controller.signOut();
    expect(repository.didSignOut, isTrue);
  });

  test('deletes the account only after repository reauthentication', () async {
    final repository = _FakeAccountRepository();
    final controller = AccountController(repository);
    addTearDown(controller.dispose);
    addTearDown(repository.dispose);
    repository.emit(_user);
    await Future<void>.delayed(Duration.zero);

    expect(await controller.deleteAccount('current-password'), isTrue);
    expect(repository.deletionPassword, 'current-password');
    expect(controller.state.user, isNull);
    expect(controller.state.accountDeleted, isTrue);
  });

  test('exposes safe account failures', () async {
    final repository = _FakeAccountRepository(
      actionFailure: AccountFailure.invalidCredentials,
    );
    final controller = AccountController(repository);
    addTearDown(controller.dispose);
    addTearDown(repository.dispose);

    await controller.signIn(email: 'a@example.com', password: 'wrongpass');
    expect(controller.state.failure, AccountFailure.invalidCredentials);
    expect(controller.state.isSubmitting, isFalse);
  });

  test('requests and verifies an email code', () async {
    final repository = _FakeAccountRepository();
    final controller = AccountController(repository);
    addTearDown(controller.dispose);
    addTearDown(repository.dispose);
    repository.emit(_unverifiedUser);
    await Future<void>.delayed(Duration.zero);

    await controller.requestEmailVerificationCode();
    expect(controller.state.verificationCodeSent, isTrue);
    await controller.verifyEmailCode('123456');
    expect(repository.verificationCode, '123456');
  });

  test('delegates social authentication and exposes link success', () async {
    final repository = _FakeAccountRepository();
    final controller = AccountController(repository);
    addTearDown(controller.dispose);
    addTearDown(repository.dispose);
    repository.emit(_user);
    await Future<void>.delayed(Duration.zero);

    await controller.continueWithProvider(AccountSignInProvider.google);
    expect(repository.provider, AccountSignInProvider.google);
    expect(controller.state.providerLinked, isTrue);
  });
}

const _user = AccountUser(
  uid: 'user-1',
  displayName: 'Listener',
  email: 'listener@example.com',
  emailVerified: true,
  linkedProviders: {AccountSignInProvider.password},
);

const _unverifiedUser = AccountUser(
  uid: 'user-2',
  displayName: 'New listener',
  email: 'new@example.com',
);

class _FakeAccountRepository implements AccountRepository {
  _FakeAccountRepository({this.actionFailure});

  final AccountFailure? actionFailure;
  final _controller = StreamController<AccountUser?>.broadcast();
  bool didRegister = false;
  bool didSignOut = false;
  String? deletionPassword;
  String? verificationCode;
  AccountSignInProvider? provider;

  void emit(AccountUser? user) => _controller.add(user);

  @override
  Stream<AccountUser?> watchAccount() => _controller.stream;

  @override
  Future<void> register({
    required String displayName,
    required String email,
    required String password,
  }) async {
    _throwIfNeeded();
    didRegister = true;
  }

  @override
  Future<void> sendPasswordReset(String email) async => _throwIfNeeded();

  @override
  Future<void> deleteAccount({String? currentPassword}) async {
    _throwIfNeeded();
    deletionPassword = currentPassword;
  }

  @override
  Future<void> requestEmailVerificationCode({String? email}) async {
    _throwIfNeeded();
  }

  @override
  Future<void> verifyEmailCode(String code) async {
    _throwIfNeeded();
    verificationCode = code;
  }

  @override
  Future<void> continueWithProvider(AccountSignInProvider provider) async {
    _throwIfNeeded();
    this.provider = provider;
  }

  @override
  Future<void> signIn({required String email, required String password}) async {
    _throwIfNeeded();
  }

  @override
  Future<void> signOut() async {
    _throwIfNeeded();
    didSignOut = true;
  }

  void _throwIfNeeded() {
    final failure = actionFailure;
    if (failure != null) throw AccountException(failure);
  }

  Future<void> dispose() => _controller.close();
}
