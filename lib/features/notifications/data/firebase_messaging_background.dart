import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

void configureFirebaseMessagingBackgroundHandler() {
  FirebaseMessaging.onBackgroundMessage(_handleBackgroundMessage);
}

@pragma('vm:entry-point')
Future<void> _handleBackgroundMessage(RemoteMessage message) async {
  if (Firebase.apps.isEmpty) await Firebase.initializeApp();
  // Notification payloads are rendered by the operating system. Data payloads
  // are intentionally not persisted or routed until a deep-link allowlist is
  // part of the product contract.
}
