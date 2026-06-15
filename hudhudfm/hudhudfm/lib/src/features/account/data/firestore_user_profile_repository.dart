import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/constants/firebase_paths.dart';
import '../domain/user_profile.dart';
import '../domain/user_profile_repository.dart';

class FirestoreUserProfileRepository implements UserProfileRepository {
  FirestoreUserProfileRepository({
    required FirebaseFirestore firestore,
    this.baseDocument = FirebasePaths.defaultBaseDocument,
  }) : _firestore = firestore;

  final FirebaseFirestore _firestore;
  final String baseDocument;

  @override
  Future<UserProfile> fetchProfile(String userId) async {
    if (userId.isEmpty) {
      return UserProfile.empty(userId);
    }

    final document = await _userDocument(userId).get();
    final data = document.data();
    if (data == null) {
      return UserProfile.empty(userId);
    }

    return UserProfile.fromMap(userId, Map<String, Object?>.from(data));
  }

  @override
  Future<void> saveProfile(UserProfile profile) async {
    final document = _userDocument(profile.userId);
    final snapshot = await document.get();
    final data = profile.toSafeMap();

    if (!snapshot.exists) {
      data['userType'] = 'USER';
      data['allowedPermissions'] = <String>[];
    }

    await document.set(data, SetOptions(merge: true));
  }

  DocumentReference<Map<String, dynamic>> _userDocument(String userId) {
    return _firestore
        .collection(FirebasePaths.userCollection(base: baseDocument))
        .doc(userId);
  }
}
