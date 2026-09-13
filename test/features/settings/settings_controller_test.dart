import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/settings/data/repositories/shared_preferences_settings_repository.dart';
import 'package:hudhud_fm/features/settings/domain/models/app_settings.dart';
import 'package:hudhud_fm/features/settings/domain/repositories/settings_repository.dart';
import 'package:hudhud_fm/features/settings/presentation/controllers/settings_controller.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _InMemorySettingsRepository implements SettingsRepository {
  _InMemorySettingsRepository({
    this.themeMode = ThemeMode.system,
    this.locale = const Locale('ar'),
  });

  ThemeMode themeMode;
  Locale locale;

  @override
  Future<ThemeMode> getThemeMode() async => themeMode;

  @override
  Future<void> setThemeMode(ThemeMode mode) async {
    themeMode = mode;
  }

  @override
  Future<Locale> getLocale() async => locale;

  @override
  Future<void> setLocale(Locale newLocale) async {
    locale = newLocale;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('AppSettings', () {
    test('equality and copyWith work correctly', () {
      const a = AppSettings();
      const b = AppSettings(themeMode: ThemeMode.system, locale: Locale('ar'));
      expect(a, equals(b));
      expect(a.hashCode, equals(b.hashCode));

      final c = a.copyWith(themeMode: ThemeMode.dark, locale: const Locale('en'));
      expect(c.themeMode, ThemeMode.dark);
      expect(c.locale, const Locale('en'));
      expect(a, isNot(equals(c)));
    });
  });

  group('SharedPreferencesSettingsRepository', () {
    test('returns default values when preferences are empty', () async {
      SharedPreferences.setMockInitialValues({});
      final repo = SharedPreferencesSettingsRepository();

      expect(await repo.getThemeMode(), ThemeMode.system);
      expect(await repo.getLocale(), const Locale('ar'));
    });

    test('persists and loads theme mode', () async {
      SharedPreferences.setMockInitialValues({});
      final repo = SharedPreferencesSettingsRepository();

      await repo.setThemeMode(ThemeMode.dark);
      expect(await repo.getThemeMode(), ThemeMode.dark);

      await repo.setThemeMode(ThemeMode.light);
      expect(await repo.getThemeMode(), ThemeMode.light);

      await repo.setThemeMode(ThemeMode.system);
      expect(await repo.getThemeMode(), ThemeMode.system);
    });

    test('persists and loads locale', () async {
      SharedPreferences.setMockInitialValues({});
      final repo = SharedPreferencesSettingsRepository();

      await repo.setLocale(const Locale('en'));
      expect(await repo.getLocale(), const Locale('en'));

      await repo.setLocale(const Locale('ar'));
      expect(await repo.getLocale(), const Locale('ar'));
    });

    test('falls back gracefully on unexpected values', () async {
      SharedPreferences.setMockInitialValues({
        'app_theme_mode': 'invalid_mode',
        'app_locale': 'fr',
      });
      final repo = SharedPreferencesSettingsRepository();

      expect(await repo.getThemeMode(), ThemeMode.system);
      expect(await repo.getLocale(), const Locale('ar'));
    });
  });

  group('SettingsController', () {
    test('loads initial settings from repository on creation', () async {
      final repo = _InMemorySettingsRepository(
        themeMode: ThemeMode.dark,
        locale: const Locale('en'),
      );
      final controller = SettingsController(repo);

      // Await microtasks for _loadSettings() to complete
      await Future<void>.delayed(Duration.zero);

      expect(controller.state.themeMode, ThemeMode.dark);
      expect(controller.state.locale, const Locale('en'));
    });

    test('setThemeMode updates state and repository', () async {
      final repo = _InMemorySettingsRepository();
      final controller = SettingsController(repo);

      await controller.setThemeMode(ThemeMode.dark);
      expect(controller.state.themeMode, ThemeMode.dark);
      expect(repo.themeMode, ThemeMode.dark);

      await controller.setThemeMode(ThemeMode.light);
      expect(controller.state.themeMode, ThemeMode.light);
      expect(repo.themeMode, ThemeMode.light);
    });

    test('setLocale updates state and repository', () async {
      final repo = _InMemorySettingsRepository();
      final controller = SettingsController(repo);

      await controller.setLocale(const Locale('en'));
      expect(controller.state.locale, const Locale('en'));
      expect(repo.locale, const Locale('en'));

      await controller.setLocale(const Locale('ar'));
      expect(controller.state.locale, const Locale('ar'));
      expect(repo.locale, const Locale('ar'));
    });
  });
}
