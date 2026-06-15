import 'package:firebase_auth/firebase_auth.dart';

import '../domain/auth_session.dart';
import '../domain/auth_session_repository.dart';

class FirebaseAuthSessionRepository implements AuthSessionRepository {
  const FirebaseAuthSessionRepository({required FirebaseAuth firebaseAuth})
    : _firebaseAuth = firebaseAuth;

  final FirebaseAuth _firebaseAuth;

  @override
  Future<AuthSession> ensureAnonymousSession() async {
    final existingUser = _firebaseAuth.currentUser;
    if (existingUser != null) {
      return _mapUser(existingUser);
    }

    final credential = await _firebaseAuth.signInAnonymously();
    return _mapUser(credential.user);
  }

  @override
  Future<AuthSession?> currentSession() async {
    return _mapUser(_firebaseAuth.currentUser);
  }

  @override
  Future<AuthSession> signInWithEmail({
    required String email,
    required String password,
  }) async {
    try {
      final credential = await _firebaseAuth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      return _mapUser(credential.user);
    } on FirebaseAuthException catch (error) {
      throw EmailAuthFailure(error.code);
    }
  }

  @override
  Future<AuthSession> registerWithEmail({
    required String email,
    required String password,
  }) async {
    try {
      final credential = await _firebaseAuth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );
      return _mapUser(credential.user);
    } on FirebaseAuthException catch (error) {
      throw EmailAuthFailure(error.code);
    }
  }

  @override
  Future<void> signOut() {
    return _firebaseAuth.signOut();
  }

  @override
  Future<void> deleteCurrentAccount() async {
    final user = _firebaseAuth.currentUser;
    if (user == null) {
      return;
    }

    try {
      await user.delete();
    } on FirebaseAuthException catch (error) {
      if (error.code == 'requires-recent-login') {
        throw const AccountDeletionRequiresRecentLogin();
      }

      rethrow;
    }
  }

  AuthSession _mapUser(User? user) {
    return AuthSession(
      userId: user?.uid ?? '',
      displayName: user?.displayName,
      email: user?.email,
      phoneNumber: user?.phoneNumber,
      photoUrl: user?.photoURL,
      isAnonymous: user?.isAnonymous ?? true,
    );
  }
}
