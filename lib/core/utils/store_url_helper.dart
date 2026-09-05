import 'package:flutter/foundation.dart';

import '../config/app_config.dart';

/// Helper to dynamically build and resolve official store URLs based on platform and package ID.
abstract final class StoreUrlHelper {
  /// Builds the store rating/download URL dynamically for the active platform.
  static String getStoreUrl({
    String? androidPackageId,
    String? iosAppId,
  }) {
    if (kIsWeb) {
      return '${AppConfig.domain}/download';
    }

    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        final pkg = androidPackageId ?? AppConfig.androidPackageId;
        return 'https://play.google.com/store/apps/details?id=$pkg';
      case TargetPlatform.iOS:
        if (iosAppId != null && iosAppId.isNotEmpty) {
          return 'https://apps.apple.com/app/id$iosAppId';
        }
        return 'https://apps.apple.com/app/${AppConfig.iosBundleId}';
      default:
        return '${AppConfig.domain}/download';
    }
  }
}
