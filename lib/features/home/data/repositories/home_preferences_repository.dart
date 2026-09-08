import 'package:shared_preferences/shared_preferences.dart';
import '../../domain/repositories/home_preferences_repository.dart';

class SharedPreferencesHomeRepository implements HomePreferencesRepository {
  const SharedPreferencesHomeRepository();
  static const _key = 'home.stationViewMode';
  @override
  Future<String?> readViewMode() async =>
      (await SharedPreferences.getInstance()).getString(_key);
  @override
  Future<void> saveViewMode(String value) async {
    await (await SharedPreferences.getInstance()).setString(_key, value);
  }
}
