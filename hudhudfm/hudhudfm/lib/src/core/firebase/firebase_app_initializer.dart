import 'package:firebase_core/firebase_core.dart';

class FirebaseAppInitializer {
  Future<bool> initialize() async {
    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp();
      }

      return true;
    } on Object {
      return false;
    }
  }
}
