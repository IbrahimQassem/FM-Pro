import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_facebook_auth/flutter_facebook_auth.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:hudhud_fm/core/config/firestore_paths.dart';
import 'package:hudhud_fm/core/config/profile_avatar.dart';
import 'package:hudhud_fm/features/account/data/datasources/account_auth_data_source.dart';

void main() {
  late _User user;
  late _Auth auth;
  late _Functions functions;
  late _Firestore firestore;
  late FirebaseAccountAuthDataSource source;

  setUp(() {
    user = _User();
    auth = _Auth(user);
    functions = _Functions();
    firestore = _Firestore();
    source = FirebaseAccountAuthDataSource(
      auth,
      firestore,
      functions,
      _Google(),
      _Facebook(),
    );
  });

  for (final code in <String?>[null, '']) {
    test('Apple deletion rejects missing revocation code ($code)', () async {
      debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
      addTearDown(() => debugDefaultTargetPlatformOverride = null);
      user.provider = 'apple.com';
      user.appleCode = code;
      await expectLater(
          source.deleteAccount(),
          throwsA(isA<AccountDataException>()
              .having((e) => e.code, 'code', 'reauthentication-required')));
      expect(auth.revokedCodes, isEmpty);
      expect(functions.calls, isEmpty);
    });
  }
  test('Apple deletion revokes authorization before deleting account',
      () async {
    debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
    addTearDown(() => debugDefaultTargetPlatformOverride = null);
    user.provider = 'apple.com';
    user.appleCode = 'synthetic-code';
    functions.responses['deleteAccountData'] = {'deleted': true};
    await source.deleteAccount();
    expect(auth.revokedCodes, ['synthetic-code']);
    expect(functions.calls.single.first, 'deleteAccountData');
  });

  test('social provider membership does not verify an unverified email',
      () async {
    user.emailVerified = false;
    final snapshot = await source.watchAccount().first;
    expect(snapshot!.providerIds, contains('google.com'));
    expect(snapshot.emailVerified, isFalse);
    await source.signIn(email: 'listener@example.test', password: 'test-only');
    expect(functions.calls, isEmpty);
  });

  test('account snapshot reads canonical name and sanitizes stored avatar',
      () async {
    firestore.profile = {
      'displayName': 'Canonical Listener',
      'avatarUrl': ProfileAvatar.assets.first
    };
    final snapshot = await source.watchAccount().first;
    expect(snapshot!.displayName, 'Canonical Listener');
    expect(snapshot.photoUrl, ProfileAvatar.assets.first);
    expect(firestore.paths, [FirestorePaths.root, 'users', 'users', user.uid]);
    firestore.profile = {'avatarUrl': '/tmp/device-photo.png'};
    expect((await source.watchAccount().first)!.photoUrl, isEmpty);
  });

  test('verified sign-in surfaces canonical profile failure', () async {
    final failure =
        FirebaseFunctionsException(code: 'unavailable', message: 'test');
    functions.errors['ensureAccountProfile'] = failure;
    await expectLater(
      source.signIn(email: 'listener@example.test', password: 'test-only'),
      throwsA(same(failure)),
    );
    expect(functions.calls.single, [
      'ensureAccountProfile',
      {'root': FirestorePaths.root}
    ]);
  });

  test('profile upload sends bounded bytes without a device path or avatar URL',
      () async {
    await source.updateProfile(
        displayName: 'Listener', photoBytes: Uint8List.fromList([1, 2, 3]));
    expect(functions.calls.single, [
      'updateAccountProfile',
      {
        'root': FirestorePaths.root,
        'displayName': 'Listener',
        'imageBase64': 'AQID'
      }
    ]);
    functions.calls.clear();
    await expectLater(
        source.updateProfile(
            displayName: 'Listener', photoBytes: Uint8List(1024 * 1024 + 1)),
        throwsA(isA<AccountDataException>()));
    expect(functions.calls, isEmpty);
  });

  test('profile update sends selected root and portable avatar to server',
      () async {
    await source.updateProfile(
        displayName: ' Listener ', photoUrl: ProfileAvatar.assets.first);
    expect(functions.calls.single, [
      'updateAccountProfile',
      {
        'root': FirestorePaths.root,
        'displayName': 'Listener',
        'avatarUrl': ProfileAvatar.assets.first,
      }
    ]);
    expect(user.reloads, 1);
  });

  test('unverified profile update and local avatar fail before calling server',
      () async {
    user.emailVerified = false;
    await expectLater(
        source.updateProfile(displayName: 'Listener'),
        throwsA(isA<AccountDataException>()
            .having((e) => e.code, 'code', 'verification-required')));
    user.emailVerified = true;
    await expectLater(
        source.updateProfile(
            displayName: 'Listener', photoUrl: '/tmp/avatar.png'),
        throwsA(isA<AccountDataException>()
            .having((e) => e.code, 'code', 'invalid-profile')));
    expect(functions.calls, isEmpty);
  });

  test('unsuccessful profile response is not presented as a saved profile',
      () async {
    functions.responses['updateAccountProfile'] = {'updated': false};
    await expectLater(
        source.updateProfile(displayName: 'Listener'),
        throwsA(isA<AccountDataException>()
            .having((e) => e.code, 'code', 'profile-unavailable')));
    expect(user.reloads, 0);
  });

  test('verification request includes root and normalized email', () async {
    await source.requestEmailVerificationCode(email: ' listener@example.test ');
    expect(functions.calls.single, [
      'requestEmailVerificationCode',
      {
        'root': FirestorePaths.root,
        'email': 'listener@example.test',
      }
    ]);
  });

  test('valid verification sends code once and refreshes user and token',
      () async {
    await source.verifyEmailCode(' 123456 ');
    expect(functions.calls, [
      [
        'verifyEmailCode',
        {'root': FirestorePaths.root, 'code': '123456'}
      ]
    ]);
    expect(user.reloads, 1);
    expect(user.tokenRefreshes, [true]);
  });

  test('interrupted verification resumes server proof without resending code',
      () async {
    functions.errors['verifyEmailCode'] =
        FirebaseFunctionsException(code: 'unavailable', message: 'test');
    await source.verifyEmailCode('123456');
    expect(functions.calls, [
      [
        'verifyEmailCode',
        {'root': FirestorePaths.root, 'code': '123456'}
      ],
      [
        'ensureAccountProfile',
        {'root': FirestorePaths.root}
      ],
    ]);
    expect(user.tokenRefreshes, [true]);
  });

  for (final code in ['user-token-expired', 'invalid-user-token']) {
    test('verification requests sign-in again after $code during reload',
        () async {
      user.reloadError = FirebaseAuthException(code: code);
      await expectLater(
          source.verifyEmailCode('123456'),
          throwsA(isA<AccountDataException>()
              .having((e) => e.code, 'code', 'verification-sign-in-required')));
      expect(functions.calls.map((call) => call[0]), ['verifyEmailCode']);
      expect(user.tokenRefreshes, isEmpty);
    });
  }

  test('invalid verification cannot fall back to profile recovery', () async {
    final failure =
        FirebaseFunctionsException(code: 'invalid-argument', message: 'test');
    functions.errors['verifyEmailCode'] = failure;
    await expectLater(source.verifyEmailCode('000000'), throwsA(same(failure)));
    expect(functions.calls.map((call) => call[0]), ['verifyEmailCode']);
    expect(user.tokenRefreshes, isEmpty);
  });

  test('failed proof recovery remains a failure and does not refresh session',
      () async {
    functions.errors['verifyEmailCode'] =
        FirebaseFunctionsException(code: 'internal', message: 'test');
    functions.responses['ensureAccountProfile'] = {'ready': false};
    await expectLater(
        source.verifyEmailCode('123456'),
        throwsA(isA<AccountDataException>()
            .having((e) => e.code, 'code', 'profile-unavailable')));
    expect(user.reloads, 0);
    expect(user.tokenRefreshes, isEmpty);
  });
}

class _Auth implements FirebaseAuth {
  _Auth(this.currentUser);
  final revokedCodes = <String>[];
  @override
  Future<void> revokeTokenWithAuthorizationCode(String code) async {
    revokedCodes.add(code);
  }

  @override
  Future<void> signOut() async {}
  @override
  final _User currentUser;
  @override
  Stream<User?> userChanges() => Stream.value(currentUser);
  @override
  Future<UserCredential> signInWithEmailAndPassword(
          {required String email, required String password}) async =>
      _Credential(currentUser);
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _User implements User {
  @override
  bool emailVerified = true;
  @override
  String get uid => 'test-listener';
  @override
  String get displayName => 'Listener';
  @override
  String get email => 'listener@example.test';
  @override
  String? get photoURL => null;
  @override
  List<UserInfo> get providerData => [_Provider(provider)];
  String provider = 'google.com';
  String? appleCode;
  @override
  Future<UserCredential> reauthenticateWithProvider(
          AuthProvider provider) async =>
      _Credential(this, appleCode: appleCode);
  int reloads = 0;
  FirebaseAuthException? reloadError;
  final tokenRefreshes = <bool>[];
  @override
  Future<void> reload() async {
    reloads++;
    if (reloadError case final error?) throw error;
  }

  @override
  Future<String?> getIdToken([bool forceRefresh = false]) async {
    tokenRefreshes.add(forceRefresh);
    return 'test-token';
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Provider implements UserInfo {
  _Provider(this.providerId);
  @override
  final String providerId;
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Credential implements UserCredential {
  _Credential(this.user, {this.appleCode});
  final String? appleCode;
  @override
  AdditionalUserInfo? get additionalUserInfo => _AdditionalInfo(appleCode);
  @override
  final User user;
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _AdditionalInfo extends AdditionalUserInfo {
  _AdditionalInfo(String? code)
      : super(isNewUser: false, authorizationCode: code);
}

class _Firestore implements FirebaseFirestore {
  Map<String, dynamic>? profile;
  final paths = <String>[];
  @override
  CollectionReference<Map<String, dynamic>> collection(String path) {
    paths.add(path);
    if (profile == null) {
      throw FirebaseException(
          plugin: 'cloud_firestore', code: 'permission-denied');
    }
    return _Collection(this);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

// Test-only SDK double: exercise the data boundary without a Firebase service.
// ignore: subtype_of_sealed_class
class _Collection implements CollectionReference<Map<String, dynamic>> {
  _Collection(this.owner);
  final _Firestore owner;
  @override
  DocumentReference<Map<String, dynamic>> doc([String? path]) {
    owner.paths.add(path!);
    return _Document(owner);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

// Test-only SDK double: exercise the data boundary without a Firebase service.
// ignore: subtype_of_sealed_class
class _Document implements DocumentReference<Map<String, dynamic>> {
  _Document(this.owner);
  final _Firestore owner;
  @override
  CollectionReference<Map<String, dynamic>> collection(String path) {
    owner.paths.add(path);
    return _Collection(owner);
  }

  @override
  Future<DocumentSnapshot<Map<String, dynamic>>> get(
          [GetOptions? options]) async =>
      _Snapshot(owner.profile!);
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

// Test-only SDK double: exercise the data boundary without a Firebase service.
// ignore: subtype_of_sealed_class
class _Snapshot implements DocumentSnapshot<Map<String, dynamic>> {
  _Snapshot(this.profile);
  final Map<String, dynamic> profile;
  @override
  bool get exists => true;
  @override
  Map<String, dynamic> data() => profile;
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Functions implements FirebaseFunctions {
  final calls = <List<dynamic>>[];
  final errors = <String, Exception>{};
  final responses = <String, Map<String, dynamic>>{
    'ensureAccountProfile': {'ready': true},
    'updateAccountProfile': {'updated': true},
    'requestEmailVerificationCode': {'sent': true},
    'verifyEmailCode': {'verified': true},
  };
  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) =>
      _Callable(this, name);
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Callable implements HttpsCallable {
  _Callable(this.owner, this.name);
  final _Functions owner;
  final String name;
  @override
  Future<HttpsCallableResult<T>> call<T>([dynamic parameters]) async {
    owner.calls.add([name, parameters]);
    if (owner.errors[name] case final error?) throw error;
    return _Result<T>(owner.responses[name] as T);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Result<T> implements HttpsCallableResult<T> {
  _Result(this.data);
  @override
  final T data;
}

class _Google implements GoogleSignIn {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Facebook implements FacebookAuth {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
