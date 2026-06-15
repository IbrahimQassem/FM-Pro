import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/constants/firebase_paths.dart';
import '../domain/program_repository.dart';
import '../domain/radio_program.dart';

class FirestoreProgramRepository implements ProgramRepository {
  FirestoreProgramRepository({
    required FirebaseFirestore firestore,
    this.baseDocument = FirebasePaths.defaultBaseDocument,
  }) : _firestore = firestore;

  final FirebaseFirestore _firestore;
  final String baseDocument;

  @override
  Future<List<RadioProgram>> fetchPrograms(String radioId) async {
    final snapshot = await _firestore
        .collection(
          FirebasePaths.programCollection(radioId, base: baseDocument),
        )
        .get();

    final programs = snapshot.docs
        .map((doc) {
          final data = Map<String, Object?>.from(doc.data());
          data.putIfAbsent('programId', () => doc.id);
          data.putIfAbsent('radioId', () => radioId);
          return RadioProgram.fromMap(data);
        })
        .where((program) => program.isVisible)
        .toList();

    return programs;
  }
}
