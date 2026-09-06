import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/foundation.dart';

/// Crash diagnostics deliberately omit exception messages and user data.
abstract final class CrashReporting {
  static Future<void> configure() async {
    if (kIsWeb) return;
    final reporter = FirebaseCrashlytics.instance;
    await reporter.setCrashlyticsCollectionEnabled(kReleaseMode);
    if (!kReleaseMode) return;
    FlutterError.onError = (details) {
      recordFatal(details.exception, details.stack ?? StackTrace.current);
    };
    PlatformDispatcher.instance.onError = (error, stack) {
      recordFatal(error, stack);
      return true;
    };
  }

  static Future<void> recordFatal(Object error, StackTrace stack) async {
    if (kIsWeb || !kReleaseMode || Firebase.apps.isEmpty) return;
    try {
      await FirebaseCrashlytics.instance.recordError(
        error.runtimeType.toString(),
        stack,
        fatal: true,
        printDetails: false,
      );
    } on Object {
      // Reporting failure must not create another unhandled exception.
    }
  }

  static Future<void> playbackEvent(String event) async {
    if (!const {'idle', 'loading', 'playing', 'paused', 'completed', 'failure'}
        .contains(event)) {
      return;
    }
    if (kIsWeb || !kReleaseMode || Firebase.apps.isEmpty) return;
    try {
      await FirebaseCrashlytics.instance.log('playback:$event');
    } on Object {
      // Diagnostics must not interrupt audio or expose stream details.
    }
  }
}
