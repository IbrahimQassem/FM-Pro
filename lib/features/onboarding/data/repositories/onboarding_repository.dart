import "package:shared_preferences/shared_preferences.dart";

abstract class OnboardingRepository {
  Future<bool> hasCompletedOnboarding();
  Future<void> completeOnboarding();
  Future<void> resetOnboarding();
}

class SharedPreferencesOnboardingRepository implements OnboardingRepository {
  SharedPreferencesOnboardingRepository({SharedPreferences? preferences})
      : _preferences = preferences;

  static const _key = "is_onboarding_completed";
  SharedPreferences? _preferences;

  Future<SharedPreferences> get _prefs async =>
      _preferences ??= await SharedPreferences.getInstance();

  @override
  Future<bool> hasCompletedOnboarding() async {
    final prefs = await _prefs;
    return prefs.getBool(_key) ?? false;
  }

  @override
  Future<void> completeOnboarding() async {
    final prefs = await _prefs;
    await prefs.setBool(_key, true);
  }

  @override
  Future<void> resetOnboarding() async {
    final prefs = await _prefs;
    await prefs.remove(_key);
  }
}
