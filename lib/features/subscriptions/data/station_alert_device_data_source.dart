import 'package:shared_preferences/shared_preferences.dart';
import 'dart:async';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import '../../../core/config/firestore_paths.dart';

class StationAlertDeviceDataSource {
  StationAlertDeviceDataSource(this._messaging, this._functions, this._auth) {
    _accountChanges = _auth.authStateChanges().listen((user) {
      if (user?.uid != _signingOutUid) _signingOutUid = null;
    });
  }
  late final StreamSubscription<User?> _accountChanges;
  String? _signingOutUid;
  bool _disposed = false;
  final FirebaseMessaging _messaging;
  final FirebaseFunctions _functions;
  final FirebaseAuth _auth;
  String? _registeredToken;
  String? _registeredUid;
  StreamSubscription<String>? _rotation;
  Future<void> _queue = Future.value();
  bool _enabled = false;
  static const _optInKey = 'notifications.stationDeviceEnabled';

  Future<bool> enable() async {
    final uid = _auth.currentUser?.uid;
    final permission = await _messaging.requestPermission();
    if (!_allowed(permission.authorizationStatus) ||
        uid == null ||
        _auth.currentUser?.uid != uid ||
        _signingOutUid == uid) {
      return false;
    }
    await reconcile(enabled: true);
    return true;
  }

  Future<void> reconcile({required bool enabled}) {
    if (_disposed ||
        (_signingOutUid != null && _signingOutUid == _auth.currentUser?.uid)) {
      return Future.value();
    }
    _enabled = enabled;
    _queue = _queue.catchError((Object _) {}).then((_) async {
      if (_disposed) return;
      if (!_enabled) {
        await unregister();
        return;
      }
      if (_auth.currentUser?.emailVerified != true) return;
      final settings = await _messaging.getNotificationSettings();
      if (!_allowed(settings.authorizationStatus)) {
        await unregister();
        return;
      }
      final uid = _auth.currentUser!.uid;
      final token = await _messaging.getToken();
      if (token == null || _auth.currentUser?.uid != uid) {
        throw StateError('Device unavailable');
      }
      if (_registeredToken != null && _registeredToken != token) {
        await unregister();
      }
      await _functions
          .httpsCallable('registerStationAlertDevice')
          .call<void>({'root': FirestorePaths.root, 'token': token});
      if (_auth.currentUser?.uid != uid) return;
      _registeredToken = token;
      _registeredUid = uid;
      await (await SharedPreferences.getInstance()).setBool(_optInKey, true);
      _rotation ??= _messaging.onTokenRefresh.listen((_) {
        unawaited(reconcile(enabled: _enabled).catchError((Object _) {}));
      });
    });
    return _queue;
  }

  Future<void> unregister() async {
    final optedIn =
        (await SharedPreferences.getInstance()).getBool(_optInKey) ?? false;
    final token =
        _registeredToken ?? (optedIn ? await _messaging.getToken() : null);
    if (token != null &&
        (_registeredUid == null || _registeredUid == _auth.currentUser?.uid) &&
        _auth.currentUser != null) {
      await _functions
          .httpsCallable('unregisterStationAlertDevice')
          .call<void>({'token': token});
    }
    await (await SharedPreferences.getInstance()).setBool(_optInKey, false);
    _registeredToken = null;
    _registeredUid = null;
  }

  Future<void> beforeSignOut() async {
    _signingOutUid = _auth.currentUser?.uid;
    _enabled = false;
    await _queue.catchError((Object _) {});
    // Resolve the SDK token after a process restart too; never persist it ourselves.
    final optedIn =
        (await SharedPreferences.getInstance()).getBool(_optInKey) ?? false;
    final token =
        _registeredToken ?? (optedIn ? await _messaging.getToken() : null);
    if (token != null) {
      await _functions
          .httpsCallable('unregisterStationAlertDevice')
          .call<void>({'token': token});
    }
    await (await SharedPreferences.getInstance()).setBool(_optInKey, false);
    _registeredToken = null;
    _registeredUid = null;
  }

  static bool _allowed(AuthorizationStatus value) =>
      value == AuthorizationStatus.authorized ||
      value == AuthorizationStatus.provisional;
  Future<void> dispose() async {
    _disposed = true;
    _enabled = false;
    await _accountChanges.cancel();
    await _rotation?.cancel();
  }
}
