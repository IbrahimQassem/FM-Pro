import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/constants/firebase_paths.dart';
import '../domain/admin_role.dart';
import '../domain/admin_role_repository.dart';

class FirestoreAdminRoleRepository implements AdminRoleRepository {
  FirestoreAdminRoleRepository({
    required FirebaseFirestore firestore,
    this.baseDocument = FirebasePaths.defaultBaseDocument,
  }) : _firestore = firestore;

  final FirebaseFirestore _firestore;
  final String baseDocument;

  @override
  Future<AdminRole> fetchRole(String userId) async {
    if (userId.isEmpty) {
      return AdminRole.anonymous;
    }

    final document = await _firestore
        .collection(FirebasePaths.userCollection(base: baseDocument))
        .doc(userId)
        .get();

    final data = document.data();
    if (data == null) {
      return AdminRole(userId: userId, role: UserRole.user);
    }

    return AdminRole.fromMap(userId, Map<String, Object?>.from(data));
  }
}
