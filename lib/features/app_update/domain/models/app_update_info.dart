import 'package:flutter/foundation.dart';

/// Information and rules regarding required (force) and optional application updates.
@immutable
class AppUpdateInfo {
  const AppUpdateInfo({
    required this.minVersionCode,
    required this.minVersionName,
    required this.latestVersionCode,
    required this.latestVersionName,
    this.forceUpdateTitleAr,
    this.forceUpdateTitleEn,
    this.forceUpdateMessageAr,
    this.forceUpdateMessageEn,
    this.optionalUpdateTitleAr,
    this.optionalUpdateTitleEn,
    this.optionalUpdateMessageAr,
    this.optionalUpdateMessageEn,
    this.storeUrlAndroid,
    this.storeUrlIos,
  });

  /// Build number threshold below which the app must refuse access.
  final int minVersionCode;

  /// User-facing semantic version string corresponding to [minVersionCode].
  final String minVersionName;

  /// Build number of the newest release available on store.
  final int latestVersionCode;

  /// User-facing semantic version string corresponding to [latestVersionCode].
  final String latestVersionName;

  /// Optional remote-configured localized titles and descriptions.
  final String? forceUpdateTitleAr;
  final String? forceUpdateTitleEn;
  final String? forceUpdateMessageAr;
  final String? forceUpdateMessageEn;
  final String? optionalUpdateTitleAr;
  final String? optionalUpdateTitleEn;
  final String? optionalUpdateMessageAr;
  final String? optionalUpdateMessageEn;

  /// Optional platform-specific store links overriding defaults.
  final String? storeUrlAndroid;
  final String? storeUrlIos;

  /// Returns true if [currentVersionCode] is strictly less than [minVersionCode].
  bool isForceUpdate(int currentVersionCode) =>
      currentVersionCode < minVersionCode;

  /// Returns true if the user meets minimum requirements but an update exists.
  bool isOptionalUpdate(int currentVersionCode) =>
      currentVersionCode >= minVersionCode &&
      currentVersionCode < latestVersionCode;

  factory AppUpdateInfo.fromMap(Map<String, dynamic> map) {
    return AppUpdateInfo(
      minVersionCode: (map['minVersionCode'] as num?)?.toInt() ?? 0,
      minVersionName: map['minVersionName'] as String? ?? '1.0.0',
      latestVersionCode: (map['latestVersionCode'] as num?)?.toInt() ?? 0,
      latestVersionName: map['latestVersionName'] as String? ?? '1.0.0',
      forceUpdateTitleAr: map['forceUpdateTitleAr'] as String?,
      forceUpdateTitleEn: map['forceUpdateTitleEn'] as String?,
      forceUpdateMessageAr: map['forceUpdateMessageAr'] as String?,
      forceUpdateMessageEn: map['forceUpdateMessageEn'] as String?,
      optionalUpdateTitleAr: map['optionalUpdateTitleAr'] as String?,
      optionalUpdateTitleEn: map['optionalUpdateTitleEn'] as String?,
      optionalUpdateMessageAr: map['optionalUpdateMessageAr'] as String?,
      optionalUpdateMessageEn: map['optionalUpdateMessageEn'] as String?,
      storeUrlAndroid: map['storeUrlAndroid'] as String?,
      storeUrlIos: map['storeUrlIos'] as String?,
    );
  }

  Map<String, dynamic> toMap() => {
        'minVersionCode': minVersionCode,
        'minVersionName': minVersionName,
        'latestVersionCode': latestVersionCode,
        'latestVersionName': latestVersionName,
        if (forceUpdateTitleAr != null) 'forceUpdateTitleAr': forceUpdateTitleAr,
        if (forceUpdateTitleEn != null) 'forceUpdateTitleEn': forceUpdateTitleEn,
        if (forceUpdateMessageAr != null)
          'forceUpdateMessageAr': forceUpdateMessageAr,
        if (forceUpdateMessageEn != null)
          'forceUpdateMessageEn': forceUpdateMessageEn,
        if (optionalUpdateTitleAr != null)
          'optionalUpdateTitleAr': optionalUpdateTitleAr,
        if (optionalUpdateTitleEn != null)
          'optionalUpdateTitleEn': optionalUpdateTitleEn,
        if (optionalUpdateMessageAr != null)
          'optionalUpdateMessageAr': optionalUpdateMessageAr,
        if (optionalUpdateMessageEn != null)
          'optionalUpdateMessageEn': optionalUpdateMessageEn,
        if (storeUrlAndroid != null) 'storeUrlAndroid': storeUrlAndroid,
        if (storeUrlIos != null) 'storeUrlIos': storeUrlIos,
      };
}
