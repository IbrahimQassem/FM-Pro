import 'user_profile.dart';

abstract class UserProfileRepository {
  Future<UserProfile> fetchProfile(String userId);

  Future<void> saveProfile(UserProfile profile);
}
