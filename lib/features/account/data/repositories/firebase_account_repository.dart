import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../../../../core/config/firestore_paths.dart';
import '../../domain/models/account_user.dart';
import '../../domain/repositories/account_repository.dart';

class FirebaseAccountRepository implements AccountRepository {
  const FirebaseAccountRepository(this._auth, this._firestore);

  final FirebaseAuth _auth;
  final FirebaseFirestore _firestore;

  @override
  Stream<AccountUser?> watchAccount() {
    return _auth.userChanges().asyncMap((user) async {
      if (user == null) return null;
      try {
        final profile = await FirestorePaths.users(
          _firestore,
        ).doc(user.uid).get();
        final data = profile.data();
        return _fromAuth(
          user,
          displayName: _text(data?['displayName']),
          username: _text(data?['username']),
        );
      } on FirebaseException {
        return _fromAuth(user);
      }
    });
  }

  @override
  Future<void> signIn({required String email, required String password}) async {
    try {
      await _auth.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
    } on FirebaseAuthException catch (error) {
      throw AccountException(_mapAuthFailure(error.code));
    } on FirebaseException {
      throw const AccountException(AccountFailure.network);
    }
  }

  @override
  Future<void> register({
    required String displayName,
    required String email,
    required String password,
  }) async {
    User? createdUser;
    try {
      final credential = await _auth.createUserWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      createdUser = credential.user;
      if (createdUser == null) {
        throw const AccountException(AccountFailure.unavailable);
      }

      final cleanName = displayName.trim();
      await createdUser.updateDisplayName(cleanName);
      await FirestorePaths.users(_firestore).doc(createdUser.uid).set({
        'displayName': cleanName,
        'username': '',
        'avatarUrl': '',
        'isActive': true,
        'role': 'listener',
        'createdAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      });
      await createdUser.reload();
    } on AccountException {
      rethrow;
    } on FirebaseAuthException catch (error) {
      await _deletePartialAccount(createdUser);
      throw AccountException(_mapAuthFailure(error.code));
    } on FirebaseException catch (error) {
      await _deletePartialAccount(createdUser);
      throw AccountException(
        error.code == 'permission-denied'
            ? AccountFailure.unavailable
            : AccountFailure.network,
      );
    }
  }

  @override
  Future<void> sendPasswordReset(String email) async {
    try {
      await _auth.sendPasswordResetEmail(email: email.trim());
    } on FirebaseAuthException catch (error) {
      throw AccountException(_mapAuthFailure(error.code));
    } on FirebaseException {
      throw const AccountException(AccountFailure.network);
    }
  }

  @override
  Future<void> signOut() async {
    try {
      await _auth.signOut();
    } on FirebaseAuthException {
      throw const AccountException(AccountFailure.unavailable);
    }
  }

  static AccountFailure _mapAuthFailure(String code) {
    return switch (code) {
      'invalid-credential' ||
      'user-not-found' ||
      'wrong-password' => AccountFailure.invalidCredentials,
      'email-already-in-use' => AccountFailure.emailAlreadyInUse,
      'weak-password' => AccountFailure.weakPassword,
      'invalid-email' => AccountFailure.invalidEmail,
      'network-request-failed' => AccountFailure.network,
      _ => AccountFailure.unavailable,
    };
  }

  static Future<void> _deletePartialAccount(User? user) async {
    if (user == null) return;
    try {
      await user.delete();
    } on Object {
      // A retry can safely complete or clean up the partial account later.
    }
  }

  static AccountUser _fromAuth(
    User user, {
    String displayName = '',
    String username = '',
  }) {
    final authName = _text(user.displayName);
    final email = _text(user.email);
    final emailPrefix = email.contains('@') ? email.split('@').first : '';
    return AccountUser(
      uid: user.uid,
      displayName: displayName.isNotEmpty
          ? displayName
          : authName.isNotEmpty
          ? authName
          : emailPrefix,
      email: email,
      username: username,
    );
  }

  static String _text(Object? value) => value is String ? value.trim() : '';
}
