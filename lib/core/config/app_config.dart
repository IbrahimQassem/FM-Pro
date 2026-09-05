/// Central application configuration for HudHud FM.
///
/// Contains domain resolution, legal policy endpoints, and platform bundle identifiers.
abstract final class AppConfig {
  /// Base domain for HudHud FM services and web presence.
  /// Can be overridden at build or runtime via `--dart-define=APP_DOMAIN=...`.
  static const String domain = String.fromEnvironment(
    'APP_DOMAIN',
    defaultValue: 'https://hudhud-fm-admin-sanadev.web.app',
  );


  /// Official Android application package ID.
  static const String androidPackageId = 'com.sanaadev.hudhudfm';

  /// Official iOS application bundle identifier.
  static const String iosBundleId = 'com.sana.dev.fm';

  /// Legal and UGC policy endpoints derived dynamically from [domain].
  static String get privacyPolicyUrl => '$domain/privacy';
  static String get termsOfServiceUrl => '$domain/terms';
  static String get communityGuidelinesUrl => '$domain/community-guidelines';
  static String get accountDeletionUrl => '$domain/account-deletion';
}
