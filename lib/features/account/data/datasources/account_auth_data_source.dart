import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_facebook_auth/flutter_facebook_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../../../../core/config/firestore_paths.dart';
import '../../domain/models/account_sign_in_provider.dart';

class AccountAuthSnapshot {
  const AccountAuthSnapshot({
    required this.uid,
    required this.displayName,
    required this.email,
    required this.emailVerified,
    required this.providerIds,
    this.photoUrl,
  });

  final String uid;
  final String displayName;
  final String email;
  final bool emailVerified;
  final Set<String> providerIds;
  final String? photoUrl;
}

class AccountDataException implements Exception {
  const AccountDataException(this.code);

  final String code;
}

abstract interface class AccountAuthDataSource {
  Stream<AccountAuthSnapshot?> watchAccount();

  Future<void> signIn({required String email, required String password});

  Future<void> register({
    required String displayName,
    required String email,
    required String password,
  });

  Future<void> updateProfile({
    required String displayName,
    String? photoUrl,
  });

  Future<void> requestEmailVerificationCode({String? email});

  Future<void> verifyEmailCode(String code);

  Future<void> continueWithProvider(AccountSignInProvider provider);

  Future<void> sendPasswordReset(String email);

  Future<void> deleteAccount({String? currentPassword});

  Future<void> signOut();
}

class FirebaseAccountAuthDataSource implements AccountAuthDataSource {
  FirebaseAccountAuthDataSource(
    this._auth,
    this._firestore,
    this._functions,
    this._googleSignIn,
    this._facebookAuth,
  );

  final FirebaseAuth _auth;
  final FirebaseFirestore _firestore;
  final FirebaseFunctions _functions;
  final GoogleSignIn _googleSignIn;
  final FacebookAuth _facebookAuth;
  Future<void>? _googleInitialization;

  @override
  Stream<AccountAuthSnapshot?> watchAccount() {
    return _auth.userChanges().asyncMap((user) async {
      if (user == null) return null;
      var displayName = _text(user.displayName);
      try {
        final profile = await FirestorePaths.users(
          _firestore,
        ).doc(user.uid).get();
        final profileName = _text(profile.data()?['displayName']);
        if (profileName.isNotEmpty) displayName = profileName;
      } on FirebaseException {
        // Unverified accounts intentionally have no readable profile yet.
      }
      return AccountAuthSnapshot(
        uid: user.uid,
        displayName: _fallbackDisplayName(displayName, user.email),
        email: _text(user.email),
        emailVerified: user.emailVerified,
        providerIds: user.providerData
            .map((provider) => provider.providerId)
            .toSet(),
      );
    });
  }

  @override
  Future<void> signIn({required String email, required String password}) async {
    final credential = await _auth.signInWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );
    if (credential.user?.emailVerified == true) {
      await _ensureAccountProfile();
    }
  }

  @override
  Future<void> updateProfile({
    required String displayName,
    String? photoUrl,
  }) async {
    final user = _auth.currentUser;
    if (user == null) throw const AccountDataException('user-unavailable');
    final trimmedName = displayName.trim();
    if (trimmedName.length < 2) {
      throw const AccountDataException('invalid-display-name');
    }
    await user.updateDisplayName(trimmedName);
    if (photoUrl != null) {
      await user.updatePhotoURL(photoUrl);
    }
    try {
      final userRef = FirestorePaths.users(_firestore).doc(user.uid);
      await userRef.set({
        'displayName': trimmedName,
        if (photoUrl != null) 'avatarUrl': photoUrl,
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
    } catch (_) {
      // Non-blocking Firestore cache update
    }
    await user.reload();
  }

  @override
  Future<void> register({
    required String displayName,
    required String email,
    required String password,
  }) async {
    final credential = await _auth.createUserWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );
    final user = credential.user;
    if (user == null) throw const AccountDataException('user-unavailable');
    await user.updateDisplayName(displayName.trim());
    await user.reload();
    await requestEmailVerificationCode();
  }

  @override
  Future<void> requestEmailVerificationCode({String? email}) async {
    final callable = _functions.httpsCallable('requestEmailVerificationCode');
    final result = await callable.call<Map<String, dynamic>>({
      if (_text(email).isNotEmpty) 'email': email!.trim(),
    });
    if (result.data['sent'] != true) {
      throw const AccountDataException('verification-delivery-failed');
    }
  }

  @override
  Future<void> verifyEmailCode(String code) async {
    final callable = _functions.httpsCallable('verifyEmailCode');
    final result = await callable.call<Map<String, dynamic>>({
      'code': code.trim(),
    });
    if (result.data['verified'] != true) {
      throw const AccountDataException('invalid-verification-code');
    }
    final user = _auth.currentUser;
    await user?.reload();
    await _auth.currentUser?.getIdToken(true);
  }

  @override
  Future<void> continueWithProvider(AccountSignInProvider provider) async {
    switch (provider) {
      case AccountSignInProvider.password:
        throw const AccountDataException('unsupported-provider');
      case AccountSignInProvider.google:
        await _continueWithCredential(await _googleCredential());
        break;
      case AccountSignInProvider.facebook:
        await _continueWithCredential(await _facebookCredential());
        break;
      case AccountSignInProvider.apple:
        await _continueWithApple();
        break;
    }
    if (_auth.currentUser?.emailVerified == true) {
      await _ensureAccountProfile();
    }
  }

  @override
  Future<void> sendPasswordReset(String email) {
    return _auth.sendPasswordResetEmail(email: email.trim());
  }

  @override
  Future<void> deleteAccount({String? currentPassword}) async {
    final user = _auth.currentUser;
    if (user == null) throw const AccountDataException('user-unavailable');
    final providerIds = user.providerData
        .map((provider) => provider.providerId)
        .toSet();
    if (providerIds.contains('apple.com') && _supportsAppleProvider) {
      final credential = await user.reauthenticateWithProvider(
        AppleAuthProvider(),
      );
      final authorizationCode =
          credential.additionalUserInfo?.authorizationCode;
      if (authorizationCode != null && authorizationCode.isNotEmpty) {
        await _auth.revokeTokenWithAuthorizationCode(authorizationCode);
      }
    } else if (providerIds.contains(EmailAuthProvider.PROVIDER_ID)) {
      final email = user.email;
      if (email == null || email.isEmpty || _text(currentPassword).isEmpty) {
        throw const AccountDataException('reauthentication-required');
      }
      await user.reauthenticateWithCredential(
        EmailAuthProvider.credential(email: email, password: currentPassword!),
      );
    } else if (providerIds.contains(GoogleAuthProvider.PROVIDER_ID)) {
      await user.reauthenticateWithCredential(await _googleCredential());
    } else if (providerIds.contains(FacebookAuthProvider.PROVIDER_ID)) {
      await user.reauthenticateWithCredential(await _facebookCredential());
    } else {
      throw const AccountDataException('reauthentication-required');
    }
    await user.getIdToken(true);
    final callable = _functions.httpsCallable('deleteAccountData');
    final result = await callable.call<Map<String, dynamic>>();
    if (result.data['deleted'] != true) {
      throw const AccountDataException('deletion-failed');
    }
    await _signOutProviderSessions();
    await _auth.signOut();
  }

  @override
  Future<void> signOut() async {
    await _auth.signOut();
    await _signOutProviderSessions();
  }

  Future<void> _continueWithCredential(AuthCredential credential) async {
    final user = _auth.currentUser;
    if (user == null) {
      await _auth.signInWithCredential(credential);
    } else {
      await user.linkWithCredential(credential);
    }
  }

  Future<void> _continueWithApple() async {
    final provider = AppleAuthProvider();
    final user = _auth.currentUser;
    if (user == null) {
      if (kIsWeb) {
        await _auth.signInWithPopup(provider);
      } else {
        await _auth.signInWithProvider(provider);
      }
    } else if (kIsWeb) {
      await user.linkWithPopup(provider);
    } else {
      await user.linkWithProvider(provider);
    }
  }

  Future<AuthCredential> _googleCredential() async {
    try {
      _googleInitialization ??= _googleSignIn.initialize();
      await _googleInitialization;
      if (!_googleSignIn.supportsAuthenticate()) {
        throw const AccountDataException('provider-not-configured');
      }
      final account = await _googleSignIn.authenticate();
      final idToken = account.authentication.idToken;
      if (idToken == null || idToken.isEmpty) {
        throw const AccountDataException('provider-credential-missing');
      }
      return GoogleAuthProvider.credential(idToken: idToken);
    } on GoogleSignInException catch (error) {
      if (error.code == GoogleSignInExceptionCode.canceled ||
          error.code == GoogleSignInExceptionCode.interrupted) {
        throw const AccountDataException('provider-cancelled');
      }
      throw const AccountDataException('provider-failed');
    } on AccountDataException {
      rethrow;
    } on Object {
      throw const AccountDataException('provider-failed');
    }
  }

  Future<AuthCredential> _facebookCredential() async {
    try {
      final result = await _facebookAuth.login(permissions: const ['email']);
      if (result.status == LoginStatus.cancelled) {
        throw const AccountDataException('provider-cancelled');
      }
      final token = result.accessToken?.tokenString;
      if (result.status != LoginStatus.success ||
          token == null ||
          token.isEmpty) {
        throw const AccountDataException('provider-failed');
      }
      return FacebookAuthProvider.credential(token);
    } on AccountDataException {
      rethrow;
    } on Object {
      throw const AccountDataException('provider-failed');
    }
  }

  Future<void> _ensureAccountProfile() async {
    final callable = _functions.httpsCallable('ensureAccountProfile');
    final result = await callable.call<Map<String, dynamic>>();
    if (result.data['ready'] != true) {
      throw const AccountDataException('profile-unavailable');
    }
  }

  Future<void> _signOutProviderSessions() async {
    try {
      _googleInitialization ??= _googleSignIn.initialize();
      await _googleInitialization;
      await _googleSignIn.signOut();
    } on Object {
      // Firebase session cleanup must not be blocked by provider cache cleanup.
    }
    try {
      await _facebookAuth.logOut();
    } on Object {
      // Firebase session cleanup must not be blocked by provider cache cleanup.
    }
  }

  static String _fallbackDisplayName(String displayName, String? email) {
    if (displayName.isNotEmpty) return displayName;
    final normalizedEmail = _text(email);
    final prefix = normalizedEmail.contains('@')
        ? normalizedEmail.split('@').first
        : '';
    return prefix.length >= 2 ? prefix : 'Listener';
  }

  static String _text(Object? value) => value is String ? value.trim() : '';

  static bool get _supportsAppleProvider =>
      kIsWeb || defaultTargetPlatform == TargetPlatform.iOS;
}
