import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/constants/firebase_paths.dart';
import '../../episodes/domain/episode.dart';
import '../../programs/domain/radio_program.dart';
import '../../radio/domain/radio_info.dart';
import '../domain/admin_content_repository.dart';

class FirestoreAdminContentRepository implements AdminContentRepository {
  FirestoreAdminContentRepository({
    required FirebaseFirestore firestore,
    this.baseDocument = FirebasePaths.defaultBaseDocument,
  }) : _firestore = firestore;

  final FirebaseFirestore _firestore;
  final String baseDocument;

  @override
  Future<void> saveRadio(RadioInfo radio) {
    return _firestore
        .collection(FirebasePaths.radioCollection(base: baseDocument))
        .doc(radio.radioId)
        .set(radio.toMap(), SetOptions(merge: true));
  }

  @override
  Future<void> saveProgram(RadioProgram program) {
    return _firestore
        .collection(
          FirebasePaths.programCollection(program.radioId, base: baseDocument),
        )
        .doc(program.programId)
        .set(program.toMap(), SetOptions(merge: true));
  }

  @override
  Future<void> saveEpisode(Episode episode) {
    return _firestore
        .collection(
          FirebasePaths.episodeCollection(episode.radioId, base: baseDocument),
        )
        .doc(episode.episodeId)
        .set(episode.toMap(), SetOptions(merge: true));
  }

  @override
  Future<void> deleteRadio(String radioId) {
    return _firestore
        .collection(FirebasePaths.radioCollection(base: baseDocument))
        .doc(radioId)
        .delete();
  }

  @override
  Future<void> deleteProgram({
    required String radioId,
    required String programId,
  }) {
    return _firestore
        .collection(
          FirebasePaths.programCollection(radioId, base: baseDocument),
        )
        .doc(programId)
        .delete();
  }

  @override
  Future<void> deleteEpisode({
    required String radioId,
    required String episodeId,
  }) {
    return _firestore
        .collection(
          FirebasePaths.episodeCollection(radioId, base: baseDocument),
        )
        .doc(episodeId)
        .delete();
  }
}
