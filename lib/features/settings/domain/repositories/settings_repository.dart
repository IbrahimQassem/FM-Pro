import 'package:flutter/material.dart';

abstract interface class SettingsRepository {
  Future<ThemeMode> getThemeMode();
  Future<void> setThemeMode(ThemeMode mode);
  Future<Locale> getLocale();
  Future<void> setLocale(Locale locale);
}
