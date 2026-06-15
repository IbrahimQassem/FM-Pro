import 'package:flutter_test/flutter_test.dart';
import 'package:hudhudfm/src/core/config/app_environment.dart';
import 'package:hudhudfm/src/core/constants/firebase_paths.dart';
import 'package:hudhudfm/src/features/account/domain/user_profile.dart';
import 'package:hudhudfm/src/features/admin/domain/admin_role.dart';
import 'package:hudhudfm/src/features/bootstrap/domain/app_remote_config.dart';
import 'package:hudhudfm/src/features/episodes/domain/episode.dart';
import 'package:hudhudfm/src/features/programs/domain/radio_program.dart';
import 'package:hudhudfm/src/features/radio/domain/radio_info.dart';

void main() {
  group('AppEnvironment', () {
    test('uses known Firebase base document and generated label', () {
      final environment = AppEnvironment.fromValues(
        firebaseBaseDocument: FirebasePaths.internewsBaseDocument,
      );

      expect(environment.firebaseBaseDocument, 'InterNews');
      expect(environment.dataSourceLabel, 'Firebase (InterNews)');
    });

    test('keeps custom label and rejects unknown base document', () {
      final environment = AppEnvironment.fromValues(
        firebaseBaseDocument: 'UnknownProduction',
        dataSourceLabel: 'Staging',
      );

      expect(
        environment.firebaseBaseDocument,
        FirebasePaths.defaultBaseDocument,
      );
      expect(environment.dataSourceLabel, 'Staging');
    });
  });

  group('FirebasePaths', () {
    test('keeps legacy nested collection contract', () {
      expect(
        FirebasePaths.radioCollection(),
        'HudHudFmGooglePlay/RadioInfo/RadioInfo',
      );
      expect(
        FirebasePaths.programCollection('radio-1'),
        'HudHudFmGooglePlay/RadioProgram/radio-1/RadioProgram/RadioProgram',
      );
      expect(
        FirebasePaths.episodeCollection('radio-1'),
        'HudHudFmGooglePlay/Episode/radio-1/Episode/Episode',
      );
      expect(FirebasePaths.userCollection(), 'HudHudFmGooglePlay/Users/Users');
      expect(FirebasePaths.storageFolder(), 'HudHudFmGooglePlay_Folder');
      expect(
        FirebasePaths.mediaObjectPath(
          parentId: 'sanaa-fm',
          fileName: 'logo.jpg',
        ),
        'HudHudFmGooglePlay_Folder/sanaa-fm/logo.jpg',
      );
    });
  });

  group('RadioInfo', () {
    test('maps legacy fields and rejects missing stream url', () {
      final radio = RadioInfo.fromMap({
        'radioId': 'radio-1',
        'name': 'إذاعة تجريبية',
        'desc': 'وصف',
        'streamUrl': '',
        'logo': null,
        'city': 'صنعاء',
        'channelFreq': 'FM 99.9',
        'priority': '4',
        'disabled': false,
      });

      expect(radio.id, 'radio-1');
      expect(radio.priority, 4);
      expect(radio.canPlay, isFalse);
    });
  });

  group('AppRemoteConfig', () {
    test('maps legacy remote config json', () {
      final config = AppRemoteConfig.fromJson('''
        {
          "adminMobile": "+967000000000",
          "developerReference": "https://example.com/dev",
          "termsReference": "https://example.com/terms",
          "isAuthSmsEnable": false,
          "isAuthGoogleEnable": true,
          "isAuthEmailEnable": false,
          "isAuthFacebookEnable": true,
          "isAdMobEnable": true,
          "isTrialMode": false,
          "requiredVersion": 42
        }
      ''');

      expect(config.requiredVersion, 42);
      expect(config.adminMobile, '+967000000000');
      expect(config.phoneAuthEnabled, isFalse);
      expect(config.googleAuthEnabled, isTrue);
      expect(config.emailAuthEnabled, isFalse);
      expect(config.facebookAuthEnabled, isTrue);
      expect(config.isAdMobEnabled, isTrue);
    });
  });

  group('AdminRole', () {
    test('maps legacy userType values', () {
      final admin = AdminRole.fromMap('user-1', {
        'userType': 'ADMIN',
        'allowedPermissions': ['manage_content'],
      });
      final superAdmin = AdminRole.fromMap('user-2', {
        'userType': 'SuperADMIN',
      });

      expect(admin.canSeeAdminTools, isTrue);
      expect(admin.canManageContent, isTrue);
      expect(superAdmin.role, UserRole.superAdmin);
      expect(superAdmin.canManageContent, isTrue);
    });
  });

  group('UserProfile', () {
    test('maps legacy profile fields and exposes only safe update fields', () {
      final profile = UserProfile.fromMap('user-1', {
        'name': 'مستخدم',
        'email': 'user@example.com',
        'mobile': '+967777777777',
        'photoUrl': 'https://example.com/photo.png',
        'nickNme': 'hudhud',
        'bio': 'نبذة',
        'tag': '@hudhud',
        'country': 'Yemen',
        'city': 'Sanaa',
        'password': 'secret',
        'userType': 'SuperADMIN',
        'allowedPermissions': ['manage_content'],
      });

      expect(profile.nickName, 'hudhud');
      expect(profile.toSafeMap(), isNot(contains('password')));
      expect(profile.toSafeMap(), isNot(contains('userType')));
      expect(profile.toSafeMap(), isNot(contains('allowedPermissions')));
    });
  });

  group('Episode', () {
    test('maps nested schedule values', () {
      final episode = Episode.fromMap({
        'epId': 'ep-1',
        'programId': 'program-1',
        'radioId': 'radio-1',
        'epName': 'حلقة',
        'epDesc': 'وصف',
        'epAnnouncer': 'مذيع',
        'epProfile': '',
        'epStreamUrl': 'https://example.com/ep.mp3',
        'programName': 'برنامج',
        'disabled': 'false',
        'programScheduleTime': [
          {
            'dateStart': '2026-01-01',
            'dateEnd': '2026-01-02',
            'timeStart': '09:00',
            'timeEnd': '10:00',
            'weekdays': ['SATURDAY'],
            'asMainTime': true,
          },
        ],
      });

      expect(episode.episodeId, 'ep-1');
      expect(episode.schedule, hasLength(1));
      expect(episode.schedule.single.asMainTime, isTrue);
      expect(episode.isVisible, isTrue);
    });
  });

  group('RadioProgram', () {
    test('maps legacy fields and exposes visibility', () {
      final program = RadioProgram.fromMap({
        'programId': 'program-1',
        'radioId': 'radio-1',
        'prName': 'برنامج',
        'prDesc': 'وصف',
        'prProfile': 'https://example.com/profile.png',
        'disabled': true,
        'createBy': 'admin',
      });

      expect(program.programId, 'program-1');
      expect(program.radioId, 'radio-1');
      expect(program.name, 'برنامج');
      expect(program.isVisible, isFalse);
    });
  });
}
