import '../domain/user_profile.dart';
import '../domain/user_profile_repository.dart';

class InMemoryUserProfileRepository implements UserProfileRepository {
  InMemoryUserProfileRepository({Map<String, UserProfile>? profiles})
    : profiles = profiles ?? <String, UserProfile>{};

  final Map<String, UserProfile> profiles;

  @override
  Future<UserProfile> fetchProfile(String userId) async {
    return profiles[userId] ?? UserProfile.empty(userId);
  }

  @override
  Future<void> saveProfile(UserProfile profile) async {
    profiles[profile.userId] = profile;
  }
}
