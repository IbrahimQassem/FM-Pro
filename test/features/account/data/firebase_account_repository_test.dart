import 'package:firebase_auth/firebase_auth.dart';
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

  test('maps safe provider cancellation and failure states', () async {
    const cases = {
      'provider-cancelled': AccountFailure.providerCancelled,
      'provider-failed': AccountFailure.providerFailed,
      'provider-not-configured': AccountFailure.providerNotConfigured,
    };
    for (final entry in cases.entries) {
      final repository = FirebaseAccountRepository(
        _FakeAccountAuthDataSource(dataErrorCode: entry.key),
      );
      await expectLater(
        repository.continueWithProvider(AccountSignInProvider.google),
        throwsA(
          isA<AccountException>().having(
            (error) => error.failure,
            'failure',
            entry.value,
          ),
        ),
      );
    }
  });

  test(
    'maps Firebase provider conflicts without exposing credentials',
    () async {
      const conflictCodes = {
        'account-exists-with-different-credential',
        'credential-already-in-use',
      };
      for (final code in conflictCodes) {
        final repository = FirebaseAccountRepository(
          _FakeAccountAuthDataSource(authErrorCode: code),
        );
        await expectLater(
          repository.continueWithProvider(AccountSignInProvider.facebook),
          throwsA(
            isA<AccountException>().having(
              (error) => error.failure,
              'failure',
              AccountFailure.accountConflict,
            ),
          ),
        );
      }
    },
  );

  test(
    'keeps a provider account without email in verification state',
    () async {
      final repository = FirebaseAccountRepository(
        _FakeAccountAuthDataSource(
          snapshot: const AccountAuthSnapshot(
            uid: 'social-without-email',
            displayName: 'Listener',
            email: '',
            emailVerified: false,
            providerIds: {'facebook.com'},
          ),
        ),
      );

      final account = await repository.watchAccount().first;
      expect(account?.uid, 'social-without-email');
      expect(account?.email, isEmpty);
      expect(account?.emailVerified, isFalse);
      expect(account?.linkedProviders, {AccountSignInProvider.facebook});
    },
  );

  test('updates profile successfully', () async {
    final dataSource = _FakeAccountAuthDataSource();
    final repository = FirebaseAccountRepository(dataSource);
    await repository.updateProfile(displayName: 'Updated Listener', photoUrl: 'https://example.com/pic.jpg');
    expect(dataSource.updatedDisplayName, 'Updated Listener');
    expect(dataSource.updatedPhotoUrl, 'https://example.com/pic.jpg');
  });
}

class _FakeAccountAuthDataSource implements AccountAuthDataSource {
  _FakeAccountAuthDataSource({
    this.snapshot,
    this.dataErrorCode,
    this.authErrorCode,
  });

  final AccountAuthSnapshot? snapshot;
  final String? dataErrorCode;
  final String? authErrorCode;
  String? requestedEmail;
  String? code;
  AccountSignInProvider? provider;
  String? updatedDisplayName;
  String? updatedPhotoUrl;

  void _throwIfNeeded() {
    final dataCode = dataErrorCode;
    if (dataCode != null) throw AccountDataException(dataCode);
    final authCode = authErrorCode;
    if (authCode != null) throw FirebaseAuthException(code: authCode);
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
  Future<void> updateProfile({
    required String displayName,
    String? photoUrl,
  }) async {
    _throwIfNeeded();
    updatedDisplayName = displayName;
    updatedPhotoUrl = photoUrl;
  }

  @override
  Future<void> verifyEmailCode(String code) async {
    _throwIfNeeded();
    this.code = code;
  }
}
