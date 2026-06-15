import '../domain/auth_session.dart';
import '../domain/auth_session_repository.dart';

class InMemoryAuthSessionRepository implements AuthSessionRepository {
  AuthSession? _session;

  @override
  Future<AuthSession> ensureAnonymousSession() async {
    return _session ??= const AuthSession(
      userId: 'local-anonymous',
      isAnonymous: true,
    );
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
    return _setEmailSession(email);
  }

  @override
  Future<AuthSession> registerWithEmail({
    required String email,
    required String password,
  }) async {
    return _setEmailSession(email);
  }

  @override
  Future<void> signOut() async {
    _session = null;
  }

  @override
  Future<void> deleteCurrentAccount() async {
    _session = null;
  }

  AuthSession _setEmailSession(String email) {
    return _session = AuthSession(
      userId: email.trim(),
      email: email.trim(),
      isAnonymous: false,
    );
  }
}
