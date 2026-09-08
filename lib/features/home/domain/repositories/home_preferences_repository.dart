abstract interface class HomePreferencesRepository {
  Future<String?> readViewMode();
  Future<void> saveViewMode(String value);
}
