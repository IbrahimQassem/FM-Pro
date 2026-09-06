import 'package:firebase_auth/firebase_auth.dart';

import '../../../../core/config/profile_avatar.dart';

import '../../domain/models/app_user.dart';
import '../../domain/repositories/user_repository.dart';
import '../datasources/home_firestore_data_source.dart';

class FirebaseUserRepository implements UserRepository {
  const FirebaseUserRepository(this._dataSource);

  final HomeFirestoreDataSource _dataSource;

  @override
  Future<AppUser> currentUser() async {
    final authUser = _dataSource.authenticatedUser;
    if (authUser == null) return const AppUser.guest();

    try {
      final profile = await _dataSource.readUser(authUser.uid);
      final data = profile.data();
      if (!profile.exists || data == null) return _fromAuth(authUser);

      final displayName = _string(data['displayName']);
      if (displayName.isEmpty) return _fromAuth(authUser);

      return AppUser(
        uid: authUser.uid,
        displayName: displayName,
        username: _string(data['username']),
        avatarUrl: ProfileAvatar.sanitize(data['avatarUrl']),
        isGuest: false,
      );
    } on FirebaseException {
      return _fromAuth(authUser);
    }
  }

  static AppUser _fromAuth(User user) {
    final displayName = user.displayName?.trim() ?? '';
    if (displayName.isEmpty) return const AppUser.guest();
    return AppUser(
      uid: user.uid,
      displayName: displayName,
      avatarUrl: ProfileAvatar.sanitize(user.photoURL),
      isGuest: false,
    );
  }

  static String _string(Object? value) {
    return value is String ? value.trim() : '';
  }
}
