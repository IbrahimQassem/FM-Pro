import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/core/config/app_config.dart';
import 'package:hudhud_fm/core/config/firestore_paths.dart';
import 'package:hudhud_fm/core/config/profile_avatar.dart';
import 'package:hudhud_fm/core/utils/store_url_helper.dart';

void main() {
  tearDown(() => debugDefaultTargetPlatformOverride = null);
  test('release root guards reject development and unknown roots', () {
    expect(
        () => FirestorePaths.validate(value: 'HudHudOfficial', release: true),
        returnsNormally);
    expect(() => FirestorePaths.validate(value: 'HudHudDev', release: true),
        throwsStateError);
    expect(() => FirestorePaths.validate(value: 'unknown', release: false),
        throwsStateError);
  });
  test('avatars preserve approved portable images and reject local paths', () {
    for (final asset in ProfileAvatar.assets) {
      expect(ProfileAvatar.sanitize(asset), asset);
    }
    expect(ProfileAvatar.sanitize('https://example.test/avatar.png'),
        'https://example.test/avatar.png');
    for (final unsafe in [
      '/tmp/photo.png',
      'file:///photo.png',
      'http://example.test/photo.png',
      'assets/unknown.png',
      'https://user:password@example.test/image'
    ]) {
      expect(ProfileAvatar.sanitize(unsafe), isEmpty);
    }
  });
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
      expect(() => StoreUrlHelper.getStoreUrl(iosAppId: ''), throwsStateError);
      expect(() => StoreUrlHelper.getStoreUrl(iosAppId: AppConfig.iosBundleId),
          throwsStateError);

      final customIosUrl = StoreUrlHelper.getStoreUrl(iosAppId: '123456789');
      expect(customIosUrl, equals('https://apps.apple.com/app/id123456789'));

      debugDefaultTargetPlatformOverride = null;
    });
  });
}
