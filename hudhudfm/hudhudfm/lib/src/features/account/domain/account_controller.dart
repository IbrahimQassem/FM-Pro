import 'package:flutter/foundation.dart';

import '../../auth/domain/auth_session.dart';
import '../../auth/domain/auth_session_repository.dart';

class AccountController extends ChangeNotifier {
  AccountController({
    required AuthSessionRepository authSessionRepository,
    required AuthSession initialSession,
  }) : _authSessionRepository = authSessionRepository,
       _session = initialSession;

  final AuthSessionRepository _authSessionRepository;

  AuthSession? _session;
  bool _isAuthenticating = false;
  bool _isSigningOut = false;
  bool _isDeletingAccount = false;

  AuthSession? get session => _session;
  bool get isAuthenticating => _isAuthenticating;
  bool get isSigningOut => _isSigningOut;
  bool get isDeletingAccount => _isDeletingAccount;

  Future<void> signInWithEmail({
    required String email,
    required String password,
  }) async {
    await _runEmailAuth(
      () => _authSessionRepository.signInWithEmail(
        email: email,
        password: password,
      ),
    );
  }

  Future<void> registerWithEmail({
    required String email,
    required String password,
  }) async {
    await _runEmailAuth(
      () => _authSessionRepository.registerWithEmail(
        email: email,
        password: password,
      ),
    );
  }

  Future<void> signOut() async {
    if (_isSigningOut) {
      return;
    }

    _isSigningOut = true;
    notifyListeners();

    try {
      await _authSessionRepository.signOut();
      _session = await _authSessionRepository.currentSession();
    } finally {
      _isSigningOut = false;
      notifyListeners();
    }
  }

  Future<void> deleteAccount() async {
    if (_isDeletingAccount) {
      return;
    }

    _isDeletingAccount = true;
    notifyListeners();

    try {
      await _authSessionRepository.deleteCurrentAccount();
      _session = await _authSessionRepository.currentSession();
    } finally {
      _isDeletingAccount = false;
      notifyListeners();
    }
  }

  Future<void> _runEmailAuth(Future<AuthSession> Function() action) async {
    if (_isAuthenticating) {
      return;
    }

    _isAuthenticating = true;
    notifyListeners();

    try {
      _session = await action();
    } finally {
      _isAuthenticating = false;
      notifyListeners();
    }
  }
}
