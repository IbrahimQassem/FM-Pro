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

  static CollectionReference<Map<String, dynamic>> favorites(
    FirebaseFirestore firestore,
    String uid,
  ) => users(firestore).doc(uid).collection('favorites');

  static CollectionReference<Map<String, dynamic>> subscriptions(
    FirebaseFirestore firestore,
    String uid,
  ) => users(firestore).doc(uid).collection('subscriptions');

  static CollectionReference<Map<String, dynamic>> locations(
    FirebaseFirestore firestore,
  ) => firestore.collection(root).doc('locations').collection('locations');

  static CollectionReference<Map<String, dynamic>> programs(
    FirebaseFirestore firestore,
  ) => firestore.collection(root).doc('programs').collection('programs');

  static CollectionReference<Map<String, dynamic>> episodes(
    FirebaseFirestore firestore,
  ) => firestore.collection(root).doc('episodes').collection('episodes');

  static CollectionReference<Map<String, dynamic>> episodeComments(
    FirebaseFirestore firestore,
    String episodeId,
  ) => episodes(firestore).doc(episodeId).collection('comments');
}
