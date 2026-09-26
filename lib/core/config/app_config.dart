import 'package:flutter/foundation.dart';

import '../services/app_version_service.dart';

/// Central application configuration for HudHud FM.
///
/// Contains domain resolution, legal policy endpoints, and platform bundle identifiers.
abstract final class AppConfig {
  /// Base domain for HudHud FM services and web presence.
  /// Can be overridden at build time via `--dart-define=APP_DOMAIN=...`.
  static const String domain = String.fromEnvironment(
    'APP_DOMAIN',
    defaultValue: 'https://hudhud-fm-admin-sanadev.web.app',
  );

  /// Official Android application package ID.
  static const String androidPackageId = 'com.sana.dev.fm';

  /// Google Web Client ID for exchanging OAuth ID tokens with Firebase Auth.
  static const String googleWebClientId = String.fromEnvironment(
    'GOOGLE_WEB_CLIENT_ID',
    defaultValue:
        '641426561966-3kt8te3o7oq3liaq66cnvld726dtform.apps.googleusercontent.com',
  );

  /// Official iOS application bundle identifier.
  static const String iosBundleId = 'com.sana.dev.fm';

  /// Numeric App Store Connect ID. Release provisioning must supply this.
  static const iosAppId = String.fromEnvironment('IOS_APP_ID');

  static bool isValidIosAppId(String value) =>
      RegExp(r'^[1-9][0-9]+$').hasMatch(value);

  static void validate({required bool requireIosStoreId}) {
    final uri = Uri.tryParse(domain);
    if (uri == null ||
        uri.scheme != 'https' ||
        uri.host.isEmpty ||
        uri.userInfo.isNotEmpty ||
        uri.hasQuery ||
        uri.hasFragment ||
        (uri.path.isNotEmpty && uri.path != '/')) {
      throw StateError('APP_DOMAIN must be an HTTPS origin.');
    }
    if (requireIosStoreId && !isValidIosAppId(iosAppId)) {
      throw StateError('A numeric IOS_APP_ID is required for iOS release.');
    }
  }

  /// Current build identity. Dynamically populated from native platform info or
  /// build-time environment defines (--dart-define=APP_VERSION_NAME=... / APP_VERSION_CODE=...).
  static String _currentVersionName =
      const String.fromEnvironment('APP_VERSION_NAME');
  static int _currentVersionCode =
      const int.fromEnvironment('APP_VERSION_CODE', defaultValue: 0);

  /// User-facing version string (e.g. "3.0.4"). Never hardcoded.
  static String get currentVersionName =>
      _currentVersionName.isNotEmpty ? _currentVersionName : '1.0.0';

  /// Numeric build code (e.g. 34). Never hardcoded.
  static int get currentVersionCode =>
      _currentVersionCode > 0 ? _currentVersionCode : 1;

  /// Initializes build version dynamically from the platform.
  static Future<void> initializeVersion([AppVersionData? overrideData]) async {
    if (overrideData != null) {
      _currentVersionName = overrideData.versionName;
      _currentVersionCode = overrideData.versionCode;
      return;
    }
    final data = await AppVersionService.getAppVersion();
    if (data.versionName.isNotEmpty) {
      _currentVersionName = data.versionName;
    }
    if (data.versionCode > 0) {
      _currentVersionCode = data.versionCode;
    }
  }

  @visibleForTesting
  static void setVersionForTesting({
    required String versionName,
    required int versionCode,
  }) {
    _currentVersionName = versionName;
    _currentVersionCode = versionCode;
  }

  /// Official contact channels and web presence.
  static const String contactPhone = '+967 775617017';
  static const String contactWhatsappNumber = '967775617017';
  static const String contactEmail = 'hudhudfm.ye@gmail.com';
  static const String contactFacebookUrl = 'https://www.facebook.com/HudhudFm';
  static const String contactTwitterUrl = 'https://x.com/HudhudFm';
  static const String contactInstagramUrl = 'https://www.instagram.com/hudhudfm';
  static String get websiteUrl => domain;

  /// Store endpoints for application updates.
  static String get playStoreMarketUrl => 'market://details?id=$androidPackageId';
  static String get playStoreWebUrl =>
      'https://play.google.com/store/apps/details?id=$androidPackageId';
  static String get appStoreUrl =>
      'https://apps.apple.com/app/id$iosAppId';

  /// Legal and UGC policy endpoints derived dynamically from [domain].
  static String get privacyPolicyUrl => '$domain/privacy';
  static String get termsOfServiceUrl => '$domain/terms';
  static String get communityGuidelinesUrl => '$domain/community-guidelines';
  static String get accountDeletionUrl => '$domain/account-deletion';
}
