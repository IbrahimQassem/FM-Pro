import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/constants/firebase_paths.dart';
import '../domain/episode.dart';
import '../domain/episode_repository.dart';

class FirestoreEpisodeRepository implements EpisodeRepository {
  FirestoreEpisodeRepository({
    required FirebaseFirestore firestore,
    this.baseDocument = FirebasePaths.defaultBaseDocument,
  }) : _firestore = firestore;

  final FirebaseFirestore _firestore;
  final String baseDocument;

  @override
  Future<List<Episode>> fetchEpisodes(String radioId) async {
    final snapshot = await _firestore
        .collection(
          FirebasePaths.episodeCollection(radioId, base: baseDocument),
        )
        .get();

    final episodes = snapshot.docs
        .map((doc) {
          final data = Map<String, Object?>.from(doc.data());
          data.putIfAbsent('epId', () => doc.id);
          data.putIfAbsent('radioId', () => radioId);
          return Episode.fromMap(data);
        })
        .where((episode) => episode.isVisible)
        .toList();

    return episodes;
  }
}
