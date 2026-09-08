import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../../../core/config/firestore_paths.dart';
import '../domain/station_subscription.dart';

class StationSubscriptionsDataSource {
  StationSubscriptionsDataSource(this._firestore, this._functions);
  final FirebaseFirestore _firestore;
  final FirebaseFunctions _functions;
  Stream<SubscriptionBatch> watch(String uid) =>
      FirestorePaths.subscriptions(_firestore, uid)
          .where('targetType', isEqualTo: 'station')
          .snapshots(includeMetadataChanges: true)
          .map((snapshot) {
        final records = <String, StationSubscription>{};
        final docs = [...snapshot.docs]..sort((a, b) {
            final x = a.data()['updatedAt'];
            final y = b.data()['updatedAt'];
            final comparison = (x is Timestamp ? x.millisecondsSinceEpoch : 0)
                .compareTo(y is Timestamp ? y.millisecondsSinceEpoch : 0);
            return comparison == 0 ? a.id.compareTo(b.id) : comparison;
          });
        final documentIds = docs.map((doc) => doc.id).toSet();
        for (final doc in docs) {
          final data = doc.data();
          final id = data['targetId'];
          if (id is! String ||
              id.isEmpty ||
              id.length > 128 ||
              id == '.' ||
              id == '..' ||
              id.contains('/') ||
              data['isActive'] is! bool ||
              data['notificationsEnabled'] is! bool) {
            continue;
          }
          if (documentIds.contains('station_$id') && doc.id != 'station_$id') {
            continue;
          }
          records[id] = StationSubscription(
              stationId: id,
              isActive: data['isActive'] as bool,
              notificationsEnabled: data['notificationsEnabled'] as bool);
        }
        return SubscriptionBatch(Map.unmodifiable(records),
            isOffline: snapshot.metadata.isFromCache);
      });
  Future<void> set(
      {required String stationId,
      required bool isActive,
      required bool notificationsEnabled}) async {
    await _functions.httpsCallable('setStationSubscription').call<void>({
      'root': FirestorePaths.root,
      'stationId': stationId,
      'isActive': isActive,
      'notificationsEnabled': notificationsEnabled
    });
  }
}
