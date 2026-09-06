import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/notifications/data/firebase_messaging_background.dart';
import '../core/services/crash_reporting.dart';

class FirebaseBootstrapState {
  const FirebaseBootstrapState._({required this.isReady});

  const FirebaseBootstrapState.ready() : this._(isReady: true);

  const FirebaseBootstrapState.unavailable() : this._(isReady: false);

  final bool isReady;
}

final firebaseBootstrapProvider = FutureProvider<FirebaseBootstrapState>(
  (ref) => initializeFirebase(),
);

Future<FirebaseBootstrapState> initializeFirebase() async {
  try {
    if (Firebase.apps.isEmpty) await Firebase.initializeApp();
    configureFirebaseMessagingBackgroundHandler();

    await CrashReporting.configure();

    return const FirebaseBootstrapState.ready();
  } on FirebaseException {
    return const FirebaseBootstrapState.unavailable();
  } on Object {
    return const FirebaseBootstrapState.unavailable();
  }
}
