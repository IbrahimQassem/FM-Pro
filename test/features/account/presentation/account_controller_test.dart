import 'package:hudhud_fm/features/account/domain/models/account_registration_result.dart';
import 'dart:typed_data';
import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/account/domain/models/account_user.dart';
import 'package:hudhud_fm/features/account/domain/models/account_sign_in_provider.dart';
import 'package:hudhud_fm/features/account/domain/repositories/account_repository.dart';
import 'package:hudhud_fm/features/account/presentation/controllers/account_controller.dart';

void main() {
  test(
      'cancelled provider and failed profile upload can retry without losing account',
      () async {
    final repository =
        _FakeAccountRepository(actionFailure: AccountFailure.providerCancelled);
    final controller = AccountController(repository);
    addTearDown(controller.dispose);
    addTearDown(repository.dispose);
    repository.emit(_user);
    await pumpEventQueue();
    await controller.continueWithProvider(AccountSignInProvider.google);
    expect(controller.state.failure, AccountFailure.providerCancelled);
    expect(controller.state.isSubmitting, false);
    expect(controller.state.user, _user);
    repository.actionFailure = AccountFailure.network;
    expect(await controller.updateProfile(displayName: 'Updated'), false);
    expect(controller.state.user, _user);
    repository.actionFailure = null;
    expect(await controller.updateProfile(displayName: 'Updated'), true);
    expect(controller.state.failure, isNull);
    expect(repository.updatedDisplayName, 'Updated');
  });
  test('failed deletion retains the account and can be retried', () async {
    final repository = _FakeAccountRepository(
        actionFailure: AccountFailure.reauthenticationFailed);
    final controller = AccountController(repository);
    addTearDown(controller.dispose);
    addTearDown(repository.dispose);
    repository.emit(_user);
    await pumpEventQueue();
    expect(await controller.deleteAccount('incorrect'), false);
    expect(controller.state.user, _user);
    expect(controller.state.accountDeleted, false);
    repository.actionFailure = null;
    expect(await controller.deleteAccount('correct'), true);
    expect(controller.state.accountDeleted, true);
  });
  test('tracks auth changes and delegates register and logout', () async {
    final repository = _FakeAccountRepository();
    final controller = AccountController(repository);
    addTearDown(controller.dispose);
    addTearDown(repository.dispose);

    await controller.register(
      displayName: 'Listener',
      email: 'listener@example.com',
      password: 'password123',
    );
    expect(repository.didRegister, isTrue);
    repository.emit(_user);
    await Future<void>.delayed(Duration.zero);
    expect(controller.state.user?.uid, 'user-1');
    expect(controller.state.isInitializing, isFalse);

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

  for (final delivery in AccountVerificationDelivery.values) {
    test('registration exposes normalized $delivery without verifying user',
        () async {
      final repository = _FakeAccountRepository()..delivery = delivery;
      final controller = AccountController(repository);
      addTearDown(controller.dispose);
      addTearDown(repository.dispose);
      await controller.register(
          displayName: 'Synthetic',
          email: 'new@example.test',
          password: 'test-only');
      repository.emit(_unverifiedUser);
      await pumpEventQueue();
      expect(controller.state.verificationCodeSent,
          delivery == AccountVerificationDelivery.sent);
      expect(
          controller.state.failure,
          switch (delivery) {
            AccountVerificationDelivery.sent => null,
            AccountVerificationDelivery.failed =>
              AccountFailure.verificationDeliveryFailed,
            AccountVerificationDelivery.rateLimited =>
              AccountFailure.verificationRateLimited,
          });
      expect(controller.state.user?.emailVerified, false);
      await controller.register(
          displayName: 'Synthetic',
          email: 'new@example.test',
          password: 'test-only');
      expect(repository.registerCalls, 1);
    });
  }

  test(
      'registration Auth event keeps submission owned and prevents duplicate creation',
      () async {
    final repository = _FakeAccountRepository()
      ..registrationBarrier = Completer<void>()
      ..delivery = AccountVerificationDelivery.failed;
    final controller = AccountController(repository);
    addTearDown(controller.dispose);
    addTearDown(repository.dispose);
    final registering = controller.register(
        displayName: 'Synthetic',
        email: 'new@example.test',
        password: 'test-only');
    repository.emit(_unverifiedUser);
    await pumpEventQueue();
    expect(controller.state.isSubmitting, true);
    await controller.register(
        displayName: 'Duplicate',
        email: 'new@example.test',
        password: 'test-only');
    await controller.requestEmailVerificationCode();
    expect(repository.registerCalls, 1);
    expect(repository.requestCalls, 0);
    repository.registrationBarrier!.complete();
    await registering;
    repository.emit(_unverifiedUser);
    await pumpEventQueue();
    expect(controller.state.failure, AccountFailure.verificationDeliveryFailed);
    expect(controller.state.verificationCodeSent, false);
    expect(controller.state.isSubmitting, false);
    await controller.requestEmailVerificationCode();
    expect(repository.requestCalls, 1);
    expect(controller.state.verificationCodeSent, true);
    expect(controller.state.failure, isNull);
  });

  test('registration creation failure stays failed and permits a later attempt',
      () async {
    final repository =
        _FakeAccountRepository(actionFailure: AccountFailure.emailAlreadyInUse);
    final controller = AccountController(repository);
    addTearDown(controller.dispose);
    addTearDown(repository.dispose);
    await controller.register(
        displayName: 'Synthetic',
        email: 'new@example.test',
        password: 'test-only');
    expect(controller.state.failure, AccountFailure.emailAlreadyInUse);
    expect(controller.state.verificationCodeSent, false);
    expect(controller.state.user, isNull);
    repository.actionFailure = null;
    await controller.register(
        displayName: 'Synthetic',
        email: 'new@example.test',
        password: 'test-only');
    expect(controller.state.verificationCodeSent, true);
  });

  test('resend clears stale sent on start and failure and can recover',
      () async {
    final repository = _FakeAccountRepository();
    final controller = AccountController(repository);
    addTearDown(controller.dispose);
    addTearDown(repository.dispose);
    repository.emit(_unverifiedUser);
    await pumpEventQueue();
    await controller.requestEmailVerificationCode();
    expect(controller.state.verificationCodeSent, true);
    repository.requestBarrier = Completer<void>();
    repository.actionFailure = AccountFailure.verificationRateLimited;
    final resending = controller.requestEmailVerificationCode();
    expect(controller.state.verificationCodeSent, false);
    repository.emit(_unverifiedUser);
    await pumpEventQueue();
    expect(controller.state.isSubmitting, true);
    await controller.requestEmailVerificationCode();
    expect(repository.requestCalls, 2);
    repository.requestBarrier!.complete();
    await resending;
    expect(controller.state.failure, AccountFailure.verificationRateLimited);
    expect(controller.state.verificationCodeSent, false);
    repository.actionFailure = null;
    await controller.requestEmailVerificationCode();
    expect(controller.state.failure, isNull);
    expect(controller.state.verificationCodeSent, true);
  });

  for (final operation in ['register', 'resend']) {
    for (final interrupt in ['identity', 'dispose']) {
      test('$operation ignores late delivery after $interrupt', () async {
        final repository = _FakeAccountRepository();
        final barrier = Completer<void>();
        final controller = AccountController(repository);
        addTearDown(repository.dispose);
        if (operation == 'resend') {
          repository.emit(_unverifiedUser);
          await pumpEventQueue();
          repository.requestBarrier = barrier;
        } else {
          repository.registrationBarrier = barrier;
        }
        final pending = operation == 'register'
            ? controller.register(
                displayName: 'Synthetic',
                email: 'new@example.test',
                password: 'test-only')
            : controller.requestEmailVerificationCode();
        if (interrupt == 'dispose') {
          controller.dispose();
        } else {
          if (operation == 'register') {
            repository.emit(_unverifiedUser);
            await pumpEventQueue();
          }
          repository.emit(_user);
          await pumpEventQueue();
          addTearDown(controller.dispose);
        }
        barrier.complete();
        await pending;
        if (interrupt == 'identity') {
          expect(controller.state.user, _user);
          expect(controller.state.verificationCodeSent, false);
          expect(controller.state.failure, isNull);
          expect(controller.state.isSubmitting, false);
        }
      });
    }
  }
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

  AccountFailure? actionFailure;
  final _controller = StreamController<AccountUser?>.broadcast();
  bool didRegister = false;
  int registerCalls = 0;
  int requestCalls = 0;
  AccountVerificationDelivery delivery = AccountVerificationDelivery.sent;
  Completer<void>? registrationBarrier;
  Completer<void>? requestBarrier;
  bool didSignOut = false;
  String? deletionPassword;
  String? verificationCode;
  AccountSignInProvider? provider;
  String? updatedDisplayName;
  String? updatedPhotoUrl;

  void emit(AccountUser? user) => _controller.add(user);

  @override
  Stream<AccountUser?> watchAccount() => _controller.stream;

  @override
  Future<AccountRegistrationResult> register({
    required String displayName,
    required String email,
    required String password,
  }) async {
    _throwIfNeeded();
    didRegister = true;
    registerCalls++;
    await registrationBarrier?.future;

    return AccountRegistrationResult(verificationDelivery: delivery);
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
    requestCalls++;
    await requestBarrier?.future;
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

  @override
  Future<void> updateProfile({
    required String displayName,
    String? photoUrl,
    Uint8List? photoBytes,
  }) async {
    _throwIfNeeded();
    updatedDisplayName = displayName;
    updatedPhotoUrl = photoUrl;
  }

  void _throwIfNeeded() {
    final failure = actionFailure;
    if (failure != null) throw AccountException(failure);
  }

  Future<void> dispose() => _controller.close();
}
