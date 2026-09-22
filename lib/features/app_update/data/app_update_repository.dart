import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';

import '../../../core/config/firestore_paths.dart';
import '../domain/models/app_update_info.dart';

abstract class AppUpdateRepository {
  Future<AppUpdateInfo?> fetchUpdateInfo();
}

class FirebaseAppUpdateRepository implements AppUpdateRepository {
  const FirebaseAppUpdateRepository({required FirebaseFirestore firestore})
      : _firestore = firestore;

  final FirebaseFirestore _firestore;

  @override
  Future<AppUpdateInfo?> fetchUpdateInfo() async {
    try {
      final docRef = FirestorePaths.appVersionConfig(_firestore);
      final snapshot = await docRef.get(const GetOptions(source: Source.serverAndCache));
      if (!snapshot.exists || snapshot.data() == null) {
        return null;
      }
      return AppUpdateInfo.fromMap(snapshot.data()!);
    } catch (e, stack) {
      debugPrint('AppUpdateRepository: Failed to fetch update config: $e\n$stack');
      return null;
    }
  }
}
