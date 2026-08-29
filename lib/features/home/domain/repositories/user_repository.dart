import '../models/app_user.dart';

abstract interface class UserRepository {
  Future<AppUser> currentUser();
}
