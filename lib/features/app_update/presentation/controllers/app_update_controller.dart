import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../../core/config/app_config.dart';
import '../../data/app_update_repository.dart';
import 'app_update_state.dart';

class AppUpdateController extends StateNotifier<AppUpdateState> {
  AppUpdateController({
    required AppUpdateRepository repository,
    Future<SharedPreferences>? preferences,
    SharedPreferences? syncPreferences,
    int? currentVersionCode,
  })  : _repository = repository,
        _preferencesFuture = preferences,
        _syncPreferences = syncPreferences,
        _currentVersionCode =
            currentVersionCode ?? AppConfig.currentVersionCode,
        super(const AppUpdateState()) {
    checkForUpdate();
  }

  final AppUpdateRepository _repository;
  final Future<SharedPreferences>? _preferencesFuture;
  SharedPreferences? _syncPreferences;
  final int _currentVersionCode;

  Future<SharedPreferences> get _prefs async =>
      _syncPreferences ??= (_preferencesFuture != null
          ? await _preferencesFuture
          : await SharedPreferences.getInstance());

  static const String prefKeyLastDismissedTime =
      'hudhud_app_update_last_dismissed_time';
  static const String prefKeyLastDismissedVersion =
      'hudhud_app_update_last_dismissed_version';
  static const Duration optionalUpdateCooldown = Duration(hours: 48);

  Future<void> checkForUpdate() async {
    state = state.copyWith(status: AppUpdateStatus.checking);
    final info = await _repository.fetchUpdateInfo();
    if (info == null) {
      state = state.copyWith(status: AppUpdateStatus.upToDate);
      return;
    }

    if (info.isForceUpdate(_currentVersionCode)) {
      state = state.copyWith(
        status: AppUpdateStatus.forceUpdateRequired,
        updateInfo: info,
        shouldPromptOptional: false,
      );
      return;
    }

    if (info.isOptionalUpdate(_currentVersionCode)) {
      final shouldPrompt =
          await _evaluateOptionalPromptCooldown(info.latestVersionCode);
      state = state.copyWith(
        status: AppUpdateStatus.optionalUpdateAvailable,
        updateInfo: info,
        shouldPromptOptional: shouldPrompt,
      );
      return;
    }

    state = state.copyWith(
      status: AppUpdateStatus.upToDate,
      updateInfo: info,
      shouldPromptOptional: false,
    );
  }

  Future<bool> _evaluateOptionalPromptCooldown(int latestVersion) async {
    try {
      final prefs = await _prefs;
      final lastDismissedVersion =
          prefs.getInt(prefKeyLastDismissedVersion);
      final lastDismissedMs = prefs.getInt(prefKeyLastDismissedTime);

      // If a brand new version code was released since last dismissal, prompt again.
      if (lastDismissedVersion == null ||
          lastDismissedVersion != latestVersion) {
        return true;
      }

      if (lastDismissedMs == null) {
        return true;
      }

      final elapsed = DateTime.now().difference(
        DateTime.fromMillisecondsSinceEpoch(lastDismissedMs),
      );
      return elapsed >= optionalUpdateCooldown;
    } catch (_) {
      return true;
    }
  }

  Future<void> dismissOptionalUpdate() async {
    try {
      final prefs = await _prefs;
      final latestCode = state.updateInfo?.latestVersionCode ?? 0;
      await prefs.setInt(
        prefKeyLastDismissedTime,
        DateTime.now().millisecondsSinceEpoch,
      );
      await prefs.setInt(prefKeyLastDismissedVersion, latestCode);
    } catch (_) {}
    state = state.copyWith(shouldPromptOptional: false);
  }
}
