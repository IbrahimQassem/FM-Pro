import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/models/app_settings.dart';
import '../../domain/repositories/settings_repository.dart';

class SettingsController extends StateNotifier<AppSettings> {
  SettingsController(
    this._repository, {
    AppSettings initialSettings = const AppSettings(),
  }) : super(initialSettings) {
    _loadFuture = _loadSettings();
  }

  final SettingsRepository _repository;
  late final Future<void> _loadFuture;
  bool _isDisposed = false;

  Future<void> get initialized => _loadFuture;

  Future<void> _loadSettings() async {
    final themeMode = await _repository.getThemeMode();
    final locale = await _repository.getLocale();
    if (_isDisposed) return;
    state = state.copyWith(themeMode: themeMode, locale: locale);
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    await _loadFuture;
    state = state.copyWith(themeMode: mode);
    await _repository.setThemeMode(mode);
  }

  Future<void> setLocale(Locale locale) async {
    await _loadFuture;
    state = state.copyWith(locale: locale);
    await _repository.setLocale(locale);
  }

  @override
  void dispose() {
    _isDisposed = true;
    super.dispose();
  }
}
