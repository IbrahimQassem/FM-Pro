import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Data model representing application version identity.
@immutable
class AppVersionData {
  const AppVersionData({
    required this.versionName,
    required this.versionCode,
  });

  final String versionName;
  final int versionCode;
}

/// Service that retrieves the running application's version and build number
/// dynamically from the underlying native platform (Android / iOS) without
/// relying on hardcoded constants.
abstract final class AppVersionService {
  static const MethodChannel _channel =
      MethodChannel('com.sana.dev.fm/app_info');

  /// Fetches application version from the native platform, falling back to
  /// compile-time environment defines (--dart-define) if running on web or if
  /// native call fails.
  static Future<AppVersionData> getAppVersion() async {
    try {
      if (!kIsWeb) {
        final result =
            await _channel.invokeMapMethod<String, dynamic>('getAppVersion');
        if (result != null) {
          final versionName = result['versionName'] as String? ?? '';
          final versionCode = (result['versionCode'] as num?)?.toInt() ?? 0;
          if (versionName.isNotEmpty || versionCode > 0) {
            return AppVersionData(
              versionName: versionName,
              versionCode: versionCode,
            );
          }
        }
      }
    } catch (e) {
      debugPrint('AppVersionService: native platform channel not available: $e');
    }

    // Fall back to build-time environment definitions (--dart-define)
    const envVersionName = String.fromEnvironment('APP_VERSION_NAME');
    const envVersionCode =
        int.fromEnvironment('APP_VERSION_CODE', defaultValue: 0);

    return AppVersionData(
      versionName: envVersionName.isNotEmpty ? envVersionName : '',
      versionCode: envVersionCode > 0 ? envVersionCode : 0,
    );
  }
}
