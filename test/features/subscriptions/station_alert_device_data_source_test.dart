import 'dart:async';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:hudhud_fm/features/subscriptions/data/station_alert_device_data_source.dart';

class _User implements User {
  @override
  String get uid => 'a';
  @override
  bool get emailVerified => true;
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Auth implements FirebaseAuth {
  @override
  User? currentUser = _User();
  final events = StreamController<User?>.broadcast();
  @override
  Stream<User?> authStateChanges() => events.stream;
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Settings implements NotificationSettings {
  _Settings(this.authorizationStatus);
  @override
  final AuthorizationStatus authorizationStatus;
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Messaging implements FirebaseMessaging {
  bool allowed = true;
  int permissionRequests = 0;
  int tokenReads = 0;
  final rotations = StreamController<String>.broadcast();
  @override
  Future<String?> getToken(
      {String? vapidKey, String? serviceWorkerScriptPath}) async {
    tokenReads++;
    return 'synthetic-token-for-device';
  }

  @override
  Stream<String> get onTokenRefresh => rotations.stream;
  @override
  Future<NotificationSettings> getNotificationSettings() async => _Settings(
      allowed ? AuthorizationStatus.authorized : AuthorizationStatus.denied);
  @override
  Future<NotificationSettings> requestPermission(
      {bool alert = true,
      bool announcement = false,
      bool badge = true,
      bool carPlay = false,
      bool criticalAlert = false,
      bool provisional = false,
      bool sound = true,
      bool providesAppNotificationSettings = false}) async {
    permissionRequests++;
    return getNotificationSettings();
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Functions implements FirebaseFunctions {
  final calls = <String>[];
  bool failUnregister = false;
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
    owner.calls.add(name);
    if (owner.failUnregister && name.startsWith('unregister')) {
      throw Exception('network');
    }
    return _Result<T>(null as T);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Result<T> implements HttpsCallableResult<T> {
  _Result(this.data);
  @override
  final T data;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late _Auth auth;
  late _Messaging messaging;
  late _Functions functions;
  late StationAlertDeviceDataSource source;
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    auth = _Auth();
    messaging = _Messaging();
    functions = _Functions();
    source = StationAlertDeviceDataSource(messaging, functions, auth);
  });
  tearDown(() async {
    await source.dispose();
    await auth.events.close();
    await messaging.rotations.close();
  });
  test('ordinary logout with no opt-in does not request permission or a token',
      () async {
    await source.beforeSignOut();
    expect(functions.calls, isEmpty);
    expect(messaging.tokenReads, 0);
    expect(messaging.permissionRequests, 0);
  });
  test('denied permission never registers or changes an existing follow',
      () async {
    messaging.allowed = false;
    expect(await source.enable(), false);
    expect(functions.calls, isEmpty);
  });
  test('explicit enable registers and failed logout cleanup is recoverable',
      () async {
    expect(await source.enable(), true);
    expect(functions.calls, ['registerStationAlertDevice']);
    functions.failUnregister = true;
    await expectLater(source.beforeSignOut(), throwsException);
    functions.failUnregister = false;
    await source.beforeSignOut();
    expect(functions.calls.last, 'unregisterStationAlertDevice');
    expect(messaging.permissionRequests, 1);
  });
  test('restart opt-in cleans the SDK registration without storing a token',
      () async {
    SharedPreferences.setMockInitialValues(
        {'notifications.stationDeviceEnabled': true});
    await source.beforeSignOut();
    expect(functions.calls, ['unregisterStationAlertDevice']);
    expect((await SharedPreferences.getInstance()).getKeys(),
        {'notifications.stationDeviceEnabled'});
  });
}
