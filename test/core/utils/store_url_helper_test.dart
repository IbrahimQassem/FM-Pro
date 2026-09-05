import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/core/config/app_config.dart';
import 'package:hudhud_fm/core/utils/store_url_helper.dart';

void main() {
  group('AppConfig and StoreUrlHelper tests', () {
    test('AppConfig resolves expected policy URLs from domain', () {
      expect(AppConfig.domain, contains('hudhud-fm-admin-sanadev.web.app'));

      expect(AppConfig.privacyPolicyUrl, equals('${AppConfig.domain}/privacy'));
      expect(AppConfig.termsOfServiceUrl, equals('${AppConfig.domain}/terms'));
      expect(
        AppConfig.communityGuidelinesUrl,
        equals('${AppConfig.domain}/community-guidelines'),
      );
      expect(
        AppConfig.accountDeletionUrl,
        equals('${AppConfig.domain}/account-deletion'),
      );
    });

    test('StoreUrlHelper builds valid store URL for Android and iOS', () {
      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      final androidUrl = StoreUrlHelper.getStoreUrl();
      expect(androidUrl, contains('play.google.com'));
      expect(androidUrl, contains(AppConfig.androidPackageId));

      debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
      final iosUrl = StoreUrlHelper.getStoreUrl();
      expect(iosUrl, contains('apps.apple.com'));
      expect(iosUrl, contains(AppConfig.iosBundleId));

      final customIosUrl = StoreUrlHelper.getStoreUrl(iosAppId: '123456789');
      expect(customIosUrl, equals('https://apps.apple.com/app/id123456789'));

      debugDefaultTargetPlatformOverride = null;
    });
  });
}
