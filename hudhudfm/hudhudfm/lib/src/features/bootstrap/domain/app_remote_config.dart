import 'dart:convert';

class AppRemoteConfig {
  const AppRemoteConfig({
    required this.requiredVersion,
    required this.isTrialMode,
    required this.isAdMobEnabled,
    required this.adminMobile,
    required this.developerReference,
    required this.termsReference,
    required this.googleAuthEnabled,
    required this.emailAuthEnabled,
    required this.facebookAuthEnabled,
    required this.phoneAuthEnabled,
  });

  factory AppRemoteConfig.fromJson(String json) {
    final decoded = jsonDecode(json);
    if (decoded is! Map<String, Object?>) {
      return AppRemoteConfig.defaults();
    }

    return AppRemoteConfig.fromMap(decoded);
  }

  factory AppRemoteConfig.fromMap(Map<String, Object?> map) {
    return AppRemoteConfig(
      requiredVersion: _intValue(map['requiredVersion']),
      isTrialMode: _boolValue(map['isTrialMode']),
      isAdMobEnabled: _boolValue(map['isAdMobEnable']),
      adminMobile: _stringValue(map['adminMobile']),
      developerReference: _stringValue(map['developerReference']),
      termsReference: _stringValue(map['termsReference']),
      googleAuthEnabled: _boolValue(map['isAuthGoogleEnable'], fallback: true),
      emailAuthEnabled: _boolValue(map['isAuthEmailEnable'], fallback: true),
      facebookAuthEnabled: _boolValue(
        map['isAuthFacebookEnable'],
        fallback: true,
      ),
      phoneAuthEnabled: _boolValue(map['isAuthSmsEnable'], fallback: true),
    );
  }

  factory AppRemoteConfig.defaults() {
    return const AppRemoteConfig(
      requiredVersion: 0,
      isTrialMode: false,
      isAdMobEnabled: false,
      adminMobile: '',
      developerReference: '',
      termsReference: '',
      googleAuthEnabled: true,
      emailAuthEnabled: true,
      facebookAuthEnabled: true,
      phoneAuthEnabled: true,
    );
  }

  final int requiredVersion;
  final bool isTrialMode;
  final bool isAdMobEnabled;
  final String adminMobile;
  final String developerReference;
  final String termsReference;
  final bool googleAuthEnabled;
  final bool emailAuthEnabled;
  final bool facebookAuthEnabled;
  final bool phoneAuthEnabled;
}

String _stringValue(Object? value) => value?.toString() ?? '';

int _intValue(Object? value) {
  if (value is int) {
    return value;
  }

  if (value is num) {
    return value.toInt();
  }

  return int.tryParse(value?.toString() ?? '') ?? 0;
}

bool _boolValue(Object? value, {bool fallback = false}) {
  if (value == null) {
    return fallback;
  }

  if (value is bool) {
    return value;
  }

  return value.toString().toLowerCase() == 'true';
}
