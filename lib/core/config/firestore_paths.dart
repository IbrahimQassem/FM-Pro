import 'package:cloud_firestore/cloud_firestore.dart';

/// Canonical development-only Firestore paths for the new application.
abstract final class FirestorePaths {
  static const root = 'HudHudDev';

  static CollectionReference<Map<String, dynamic>> stations(
    FirebaseFirestore firestore,
  ) => firestore.collection(root).doc('stations').collection('stations');

  static CollectionReference<Map<String, dynamic>> banners(
    FirebaseFirestore firestore,
  ) => firestore.collection(root).doc('banners').collection('banners');

  static CollectionReference<Map<String, dynamic>> users(
    FirebaseFirestore firestore,
  ) => firestore.collection(root).doc('users').collection('users');

  static CollectionReference<Map<String, dynamic>> locations(
    FirebaseFirestore firestore,
  ) => firestore.collection(root).doc('locations').collection('locations');
}
