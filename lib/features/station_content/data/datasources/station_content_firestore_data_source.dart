import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../../core/config/firestore_paths.dart';

class StationContentFirestoreDataSource {
  const StationContentFirestoreDataSource(this._firestore);

  final FirebaseFirestore _firestore;

  Future<List<QueryDocumentSnapshot<Map<String, dynamic>>>> readPrograms({
    required String stationId,
    required Source source,
  }) async {
    final snapshot = await FirestorePaths.programs(
      _firestore,
    ).where('stationId', isEqualTo: stationId).get(GetOptions(source: source));
    return snapshot.docs;
  }

  Future<List<QueryDocumentSnapshot<Map<String, dynamic>>>> readEpisodes({
    required String stationId,
    required Source source,
  }) async {
    final snapshot = await FirestorePaths.episodes(
      _firestore,
    ).where('stationId', isEqualTo: stationId).get(GetOptions(source: source));
    return snapshot.docs;
  }
}
