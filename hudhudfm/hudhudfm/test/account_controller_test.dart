import 'package:flutter_test/flutter_test.dart';
import 'package:hudhudfm/src/features/account/domain/account_controller.dart';
import 'package:hudhudfm/src/features/auth/domain/auth_session.dart';
import 'package:hudhudfm/src/features/auth/domain/auth_session_repository.dart';

void main() {
  test(
    'signOut delegates to auth repository and clears session state',
    () async {
      final repository = _RecordingAuthSessionRepository();
      final controller = AccountController(
        authSessionRepository: repository,
        initialSession: const AuthSession(userId: 'user-1', isAnonymous: true),
      );

      await controller.signOut();

      expect(repository.didSignOut, isTrue);
      expect(controller.session, isNull);
      expect(controller.isSigningOut, isFalse);
    },
  );

  test(
    'deleteAccount delegates to auth repository and clears session',
    () async {
      final repository = _RecordingAuthSessionRepository();
      final controller = AccountController(
        authSessionRepository: repository,
        initialSession: const AuthSession(userId: 'user-1', isAnonymous: true),
      );

      await controller.deleteAccount();

      expect(repository.didDeleteAccount, isTrue);
      expect(controller.session, isNull);
      expect(controller.isDeletingAccount, isFalse);
    },
  );

  test(
    'deleteAccount resets busy state when recent login is required',
    () async {
      final repository = _RecentLoginRequiredAuthSessionRepository();
      final controller = AccountController(
        authSessionRepository: repository,
        initialSession: const AuthSession(userId: 'user-1', isAnonymous: false),
      );

      await expectLater(
        controller.deleteAccount(),
        throwsA(isA<AccountDeletionRequiresRecentLogin>()),
      );

      expect(controller.session?.userId, 'user-1');
      expect(controller.isDeletingAccount, isFalse);
    },
  );

  test('registerWithEmail updates session from repository', () async {
    final repository = _RecordingAuthSessionRepository();
    final controller = AccountController(
      authSessionRepository: repository,
      initialSession: const AuthSession(userId: 'user-1', isAnonymous: true),
    );

    await controller.registerWithEmail(
      email: 'user@example.com',
      password: 'secret123',
    );

    expect(repository.registeredEmail, 'user@example.com');
    expect(controller.session?.email, 'user@example.com');
    expect(controller.session?.isAnonymous, isFalse);
    expect(controller.isAuthenticating, isFalse);
  });

  test('signInWithEmail updates session from repository', () async {
    final repository = _RecordingAuthSessionRepository();
    final controller = AccountController(
      authSessionRepository: repository,
      initialSession: const AuthSession(userId: 'user-1', isAnonymous: true),
    );

    await controller.signInWithEmail(
      email: 'user@example.com',
      password: 'secret123',
    );

    expect(repository.signedInEmail, 'user@example.com');
    expect(controller.session?.email, 'user@example.com');
    expect(controller.session?.isAnonymous, isFalse);
    expect(controller.isAuthenticating, isFalse);
  });
}

class _RecordingAuthSessionRepository implements AuthSessionRepository {
  bool didSignOut = false;
  bool didDeleteAccount = false;
  String? signedInEmail;
  String? registeredEmail;
  AuthSession? _session = const AuthSession(
    userId: 'user-1',
    isAnonymous: true,
  );

  @override
  Future<AuthSession> ensureAnonymousSession() async {
    return _session ??= const AuthSession(userId: 'user-1', isAnonymous: true);
  }

  @override
  Future<AuthSession?> currentSession() async {
    return _session;
  }

  @override
  Future<AuthSession> signInWithEmail({
    required String email,
    required String password,
  }) async {
    signedInEmail = email;
    return _session = AuthSession(
      userId: email,
      email: email,
      isAnonymous: false,
    );
  }

  @override
  Future<AuthSession> registerWithEmail({
    required String email,
    required String password,
  }) async {
    registeredEmail = email;
    return _session = AuthSession(
      userId: email,
      email: email,
      isAnonymous: false,
    );
  }

  @override
  Future<void> signOut() async {
    didSignOut = true;
    _session = null;
  }

  @override
  Future<void> deleteCurrentAccount() async {
    didDeleteAccount = true;
    _session = null;
  }
}

class _RecentLoginRequiredAuthSessionRepository
    implements AuthSessionRepository {
  AuthSession? _session = const AuthSession(
    userId: 'user-1',
    isAnonymous: false,
  );

  @override
  Future<AuthSession> ensureAnonymousSession() async {
    return _session!;
  }

  @override
  Future<AuthSession?> currentSession() async {
    return _session;
  }

  @override
  Future<AuthSession> signInWithEmail({
    required String email,
    required String password,
  }) async {
    return _session = AuthSession(
      userId: email,
      email: email,
      isAnonymous: false,
    );
  }

  @override
  Future<AuthSession> registerWithEmail({
    required String email,
    required String password,
  }) async {
    return _session = AuthSession(
      userId: email,
      email: email,
      isAnonymous: false,
    );
  }

  @override
  Future<void> signOut() async {
    _session = null;
  }

  @override
  Future<void> deleteCurrentAccount() async {
    throw const AccountDeletionRequiresRecentLogin();
  }
}
