import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/app_update/domain/models/app_update_info.dart';

void main() {
  group('AppUpdateInfo', () {
    test('identifies force update when current version is strictly below minimum', () {
      const info = AppUpdateInfo(
        minVersionCode: 35,
        minVersionName: '3.1.0',
        latestVersionCode: 38,
        latestVersionName: '3.1.3',
      );

      // Current is below min
      expect(info.isForceUpdate(33), isTrue);
      expect(info.isOptionalUpdate(33), isFalse);

      // Current meets min exactly
      expect(info.isForceUpdate(35), isFalse);
      expect(info.isOptionalUpdate(35), isTrue);

      // Current is between min and latest
      expect(info.isForceUpdate(36), isFalse);
      expect(info.isOptionalUpdate(36), isTrue);

      // Current is at or above latest
      expect(info.isForceUpdate(38), isFalse);
      expect(info.isOptionalUpdate(38), isFalse);
      expect(info.isForceUpdate(40), isFalse);
      expect(info.isOptionalUpdate(40), isFalse);
    });

    test('serializes to and from Map accurately', () {
      final original = const AppUpdateInfo(
        minVersionCode: 30,
        minVersionName: '3.0.0',
        latestVersionCode: 33,
        latestVersionName: '3.0.3',
        forceUpdateTitleAr: 'تحديث مطلوب',
        forceUpdateTitleEn: 'Update Required',
        forceUpdateMessageAr: 'يرجى التحديث',
        forceUpdateMessageEn: 'Please update',
        optionalUpdateTitleAr: 'تحديث متاح',
        optionalUpdateTitleEn: 'Update Available',
        optionalUpdateMessageAr: 'إصدار جديد',
        optionalUpdateMessageEn: 'New version',
        storeUrlAndroid: 'market://details?id=com.sana.dev.fm',
        storeUrlIos: 'https://apps.apple.com/app/id123',
      );

      final map = original.toMap();
      final reconstructed = AppUpdateInfo.fromMap(map);

      expect(reconstructed.minVersionCode, 30);
      expect(reconstructed.minVersionName, '3.0.0');
      expect(reconstructed.latestVersionCode, 33);
      expect(reconstructed.latestVersionName, '3.0.3');
      expect(reconstructed.forceUpdateTitleAr, 'تحديث مطلوب');
      expect(reconstructed.forceUpdateTitleEn, 'Update Required');
      expect(reconstructed.forceUpdateMessageAr, 'يرجى التحديث');
      expect(reconstructed.forceUpdateMessageEn, 'Please update');
      expect(reconstructed.optionalUpdateTitleAr, 'تحديث متاح');
      expect(reconstructed.optionalUpdateTitleEn, 'Update Available');
      expect(reconstructed.optionalUpdateMessageAr, 'إصدار جديد');
      expect(reconstructed.optionalUpdateMessageEn, 'New version');
      expect(reconstructed.storeUrlAndroid, 'market://details?id=com.sana.dev.fm');
      expect(reconstructed.storeUrlIos, 'https://apps.apple.com/app/id123');
    });
  });
}
