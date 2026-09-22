import 'package:flutter/foundation.dart';

import '../../domain/models/app_update_info.dart';

enum AppUpdateStatus {
  idle,
  checking,
  upToDate,
  optionalUpdateAvailable,
  forceUpdateRequired,
}

@immutable
class AppUpdateState {
  const AppUpdateState({
    this.status = AppUpdateStatus.idle,
    this.updateInfo,
    this.shouldPromptOptional = false,
  });

  final AppUpdateStatus status;
  final AppUpdateInfo? updateInfo;
  final bool shouldPromptOptional;

  bool get isForceUpdate => status == AppUpdateStatus.forceUpdateRequired;
  bool get isOptionalUpdate => status == AppUpdateStatus.optionalUpdateAvailable;

  AppUpdateState copyWith({
    AppUpdateStatus? status,
    AppUpdateInfo? updateInfo,
    bool? shouldPromptOptional,
  }) {
    return AppUpdateState(
      status: status ?? this.status,
      updateInfo: updateInfo ?? this.updateInfo,
      shouldPromptOptional: shouldPromptOptional ?? this.shouldPromptOptional,
    );
  }
}
