import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/constants/firebase_paths.dart';
import '../domain/radio_info.dart';
import '../domain/radio_repository.dart';

class FirestoreRadioRepository implements RadioRepository {
  FirestoreRadioRepository({
    required FirebaseFirestore firestore,
    this.baseDocument = FirebasePaths.defaultBaseDocument,
  }) : _firestore = firestore;

  final FirebaseFirestore _firestore;
  final String baseDocument;

  @override
  Future<List<RadioInfo>> fetchActiveRadios() async {
    final snapshot = await _firestore
        .collection(FirebasePaths.radioCollection(base: baseDocument))
        .get();

    final radios =
        snapshot.docs
            .map((doc) {
              final data = Map<String, Object?>.from(doc.data());
              data.putIfAbsent('id', () => doc.id);
              data.putIfAbsent('radioId', () => doc.id);
              return RadioInfo.fromMap(data);
            })
            .where((radio) => !radio.disabled)
            .toList()
          ..sort((left, right) => left.priority.compareTo(right.priority));

    return radios;
  }
}
