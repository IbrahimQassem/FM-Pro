import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/notifications/data/firebase_messaging_background.dart';

class FirebaseBootstrapState {
  const FirebaseBootstrapState._({required this.isReady});

  const FirebaseBootstrapState.ready() : this._(isReady: true);

  const FirebaseBootstrapState.unavailable() : this._(isReady: false);

  final bool isReady;
}

final firebaseBootstrapProvider = FutureProvider<FirebaseBootstrapState>((
  ref,
) async {
  try {
    if (Firebase.apps.isEmpty) await Firebase.initializeApp();
    configureFirebaseMessagingBackgroundHandler();

    if (!kIsWeb) {
      FlutterError.onError = FirebaseCrashlytics.instance.recordFlutterFatalError;
      PlatformDispatcher.instance.onError = (error, stack) {
        FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
        return true;
      };
    }

    return const FirebaseBootstrapState.ready();
  } on FirebaseException {
    return const FirebaseBootstrapState.unavailable();
  } on Object {
    return const FirebaseBootstrapState.unavailable();
  }
});
