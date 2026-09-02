import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/account/data/datasources/account_auth_data_source.dart';
import 'package:hudhud_fm/features/account/data/repositories/firebase_account_repository.dart';
import 'package:hudhud_fm/features/account/domain/models/account_sign_in_provider.dart';
import 'package:hudhud_fm/features/account/domain/repositories/account_repository.dart';

void main() {
  test('maps auth and provider state without exposing SDK models', () async {
    final dataSource = _FakeAccountAuthDataSource(
      snapshot: const AccountAuthSnapshot(
        uid: 'user-1',
        displayName: 'Listener',
        email: 'listener@example.com',
        emailVerified: true,
        providerIds: {'password', 'google.com'},
      ),
    );
    final repository = FirebaseAccountRepository(dataSource);

    final account = await repository.watchAccount().first;
    expect(account?.emailVerified, isTrue);
    expect(account?.linkedProviders, {
      AccountSignInProvider.password,
      AccountSignInProvider.google,
    });
  });

  test('delegates verification and provider actions', () async {
    final dataSource = _FakeAccountAuthDataSource();
    final repository = FirebaseAccountRepository(dataSource);

    await repository.requestEmailVerificationCode(email: 'new@example.com');
    await repository.verifyEmailCode('123456');
    await repository.continueWithProvider(AccountSignInProvider.facebook);

    expect(dataSource.requestedEmail, 'new@example.com');
    expect(dataSource.code, '123456');
    expect(dataSource.provider, AccountSignInProvider.facebook);
  });

  test('maps safe provider and verification failures', () async {
    final repository = FirebaseAccountRepository(
      _FakeAccountAuthDataSource(errorCode: 'provider-cancelled'),
    );
    await expectLater(
      repository.continueWithProvider(AccountSignInProvider.google),
      throwsA(
        isA<AccountException>().having(
          (error) => error.failure,
          'failure',
          AccountFailure.providerCancelled,
        ),
      ),
    );
  });
}

class _FakeAccountAuthDataSource implements AccountAuthDataSource {
  _FakeAccountAuthDataSource({this.snapshot, this.errorCode});

  final AccountAuthSnapshot? snapshot;
  final String? errorCode;
  String? requestedEmail;
  String? code;
  AccountSignInProvider? provider;

  void _throwIfNeeded() {
    final value = errorCode;
    if (value != null) throw AccountDataException(value);
  }

  @override
  Stream<AccountAuthSnapshot?> watchAccount() => Stream.value(snapshot);

  @override
  Future<void> continueWithProvider(AccountSignInProvider provider) async {
    _throwIfNeeded();
    this.provider = provider;
  }

  @override
  Future<void> deleteAccount({String? currentPassword}) async {
    _throwIfNeeded();
  }

  @override
  Future<void> register({
    required String displayName,
    required String email,
    required String password,
  }) async {
    _throwIfNeeded();
  }

  @override
  Future<void> requestEmailVerificationCode({String? email}) async {
    _throwIfNeeded();
    requestedEmail = email;
  }

  @override
  Future<void> sendPasswordReset(String email) async {
    _throwIfNeeded();
  }

  @override
  Future<void> signIn({required String email, required String password}) async {
    _throwIfNeeded();
  }

  @override
  Future<void> signOut() async {
    _throwIfNeeded();
  }

  @override
  Future<void> verifyEmailCode(String code) async {
    _throwIfNeeded();
    this.code = code;
  }
}
