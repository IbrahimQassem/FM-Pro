import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../domain/repositories/settings_repository.dart';

class SharedPreferencesSettingsRepository implements SettingsRepository {
  SharedPreferencesSettingsRepository({SharedPreferences? preferences})
      : _preferences = preferences;

  static const _themeModeKey = 'app_theme_mode';
  static const _localeKey = 'app_locale';

  SharedPreferences? _preferences;

  Future<SharedPreferences> get _prefs async =>
      _preferences ??= await SharedPreferences.getInstance();

  @override
  Future<ThemeMode> getThemeMode() async {
    try {
      final prefs = await _prefs;
      final raw = prefs.getString(_themeModeKey);
      return switch (raw) {
        'light' => ThemeMode.light,
        'dark' => ThemeMode.dark,
        'system' => ThemeMode.system,
        _ => ThemeMode.system,
      };
    } catch (_) {
      return ThemeMode.system;
    }
  }

  @override
  Future<void> setThemeMode(ThemeMode mode) async {
    try {
      final prefs = await _prefs;
      await prefs.setString(_themeModeKey, mode.name);
    } catch (_) {}
  }

  @override
  Future<Locale> getLocale() async {
    try {
      final prefs = await _prefs;
      final raw = prefs.getString(_localeKey);
      return switch (raw) {
        'en' => const Locale('en'),
        'ar' => const Locale('ar'),
        _ => const Locale('ar'),
      };
    } catch (_) {
      return const Locale('ar');
    }
  }

  @override
  Future<void> setLocale(Locale locale) async {
    try {
      final prefs = await _prefs;
      await prefs.setString(_localeKey, locale.languageCode);
    } catch (_) {}
  }
}
