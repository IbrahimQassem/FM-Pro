import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/account/domain/models/account_user.dart';
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
}

const _user = AccountUser(
  uid: 'user-1',
  displayName: 'Listener',
  email: 'listener@example.com',
);

class _FakeAccountRepository implements AccountRepository {
  _FakeAccountRepository({this.actionFailure});

  final AccountFailure? actionFailure;
  final _controller = StreamController<AccountUser?>.broadcast();
  bool didRegister = false;
  bool didSignOut = false;
  String? deletionPassword;

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
  Future<void> deleteAccount({required String currentPassword}) async {
    _throwIfNeeded();
    deletionPassword = currentPassword;
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
