import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../../../../core/config/firestore_paths.dart';

class HomeFirestoreDataSource {
  const HomeFirestoreDataSource(this._firestore, this._auth);

  final FirebaseFirestore _firestore;
  final FirebaseAuth _auth;

  Future<List<QueryDocumentSnapshot<Map<String, dynamic>>>> readStations(
    Source source,
  ) async {
    final snapshot = await FirestorePaths.stations(
      _firestore,
    ).orderBy('priority', descending: true).get(GetOptions(source: source));
    return snapshot.docs;
  }

  Future<List<QueryDocumentSnapshot<Map<String, dynamic>>>> readBanners(
    Source source,
  ) async {
    final snapshot = await FirestorePaths.banners(
      _firestore,
    ).orderBy('priority', descending: true).get(GetOptions(source: source));
    return snapshot.docs;
  }

  Future<List<QueryDocumentSnapshot<Map<String, dynamic>>>> readLocations(
    Source source,
  ) async {
    final snapshot = await FirestorePaths.locations(
      _firestore,
    ).orderBy('sortOrder').get(GetOptions(source: source));
    return snapshot.docs;
  }

  User? get authenticatedUser => _auth.currentUser;

  Future<DocumentSnapshot<Map<String, dynamic>>> readUser(String uid) {
    return FirestorePaths.users(_firestore).doc(uid).get();
  }
}
