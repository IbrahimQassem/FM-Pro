import 'package:cloud_firestore/cloud_firestore.dart';
import '../../../../core/config/firestore_paths.dart';
import '../../domain/models/favorite_item.dart';

class FavoritesFirestoreDataSource {
  const FavoritesFirestoreDataSource(this._firestore);

  final FirebaseFirestore _firestore;

  Stream<Set<String>> watchFavoriteTargetIds({
    required String uid,
    required FavoriteTargetType targetType,
  }) {
    return FirestorePaths.favorites(_firestore, uid)
        .where('targetType', isEqualTo: targetType.name)
        .snapshots()
        .map((snapshot) {
      final ids = <String>{};
      for (final doc in snapshot.docs) {
        final data = doc.data();
        final targetId = data['targetId'];
        if (targetId is String && targetId.isNotEmpty) {
          ids.add(targetId);
        }
      }
      return ids;
    });
  }

  Future<void> addFavorite({
    required String uid,
    required FavoriteTargetType targetType,
    required String targetId,
  }) async {
    final docId = FavoriteItem.deterministicId(targetType, targetId);
    await FirestorePaths.favorites(_firestore, uid).doc(docId).set({
      'targetType': targetType.name,
      'targetId': targetId,
      'createdAt': FieldValue.serverTimestamp(),
    });
  }

  Future<void> removeFavorite({
    required String uid,
    required FavoriteTargetType targetType,
    required String targetId,
  }) async {
    final docId = FavoriteItem.deterministicId(targetType, targetId);
    final collection = FirestorePaths.favorites(_firestore, uid);
    await collection.doc(docId).delete();
  }
}
