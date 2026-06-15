import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhudfm/src/app/app_bootstrap.dart';
import 'package:hudhudfm/src/app/hudhud_fm_app.dart';
import 'package:hudhudfm/src/features/account/data/in_memory_user_profile_repository.dart';
import 'package:hudhudfm/src/features/admin/data/in_memory_admin_content_repository.dart';
import 'package:hudhudfm/src/features/admin/data/in_memory_admin_role_repository.dart';
import 'package:hudhudfm/src/features/admin/domain/admin_role.dart';
import 'package:hudhudfm/src/features/auth/data/in_memory_auth_session_repository.dart';
import 'package:hudhudfm/src/features/bootstrap/domain/app_remote_config.dart';
import 'package:hudhudfm/src/features/bootstrap/domain/remote_config_repository.dart';
import 'package:hudhudfm/src/features/radio/data/in_memory_radio_repository.dart';
import 'package:hudhudfm/src/features/version/domain/app_version.dart';
import 'package:hudhudfm/src/features/version/domain/app_version_repository.dart';

void main() {
  testWidgets('shows Hudhud FM radio shell', (tester) async {
    await tester.pumpWidget(const HudhudFmApp());
    await tester.pumpAndSettle();

    expect(find.text('هدهد FM'), findsWidgets);
    expect(find.text('إذاعات'), findsOneWidget);
    expect(find.text('إذاعة صنعاء'), findsOneWidget);
    expect(find.text('إدارة'), findsNothing);
  });

  testWidgets('shows programs and episodes for selected radio', (tester) async {
    await tester.pumpWidget(const HudhudFmApp());
    await tester.pumpAndSettle();

    await tester.tap(find.text('برامج'));
    await tester.pumpAndSettle();

    expect(find.text('صباح هدهد'), findsOneWidget);
    expect(find.text('نشرة الأخبار'), findsOneWidget);

    await tester.tap(find.text('حلقات'));
    await tester.pumpAndSettle();

    expect(find.text('بداية اليوم'), findsOneWidget);
    expect(find.text('ملخص الأخبار'), findsOneWidget);
  });

  testWidgets('shows admin tab only for admin roles', (tester) async {
    tester.view.physicalSize = const Size(1000, 1200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final contentRepository = InMemoryAdminContentRepository();
    final bootstrap = AppBootstrap(
      authSessionRepository: InMemoryAuthSessionRepository(),
      radioRepository: InMemoryRadioRepository(),
      adminContentRepository: contentRepository,
      adminRoleRepository: const InMemoryAdminRoleRepository(
        role: AdminRole(userId: 'local-anonymous', role: UserRole.superAdmin),
      ),
    );

    await tester.pumpWidget(HudhudFmApp(bootstrap: bootstrap));
    await tester.pumpAndSettle();

    expect(find.text('إدارة'), findsOneWidget);

    await tester.tap(find.text('إدارة'));
    await tester.pumpAndSettle();

    expect(find.text('لوحة الإدارة'), findsOneWidget);
    expect(find.text('مشرف أعلى'), findsOneWidget);
    expect(find.text('إدارة إذاعة'), findsOneWidget);

    await tester.enterText(
      find.widgetWithText(TextFormField, 'اسم الإذاعة'),
      'إذاعة اختبار',
    );
    await tester.ensureVisible(find.text('تعطيل الإذاعة'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('تعطيل الإذاعة'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('حفظ الإذاعة'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('حفظ الإذاعة'));
    await tester.pumpAndSettle();

    expect(contentRepository.radios['sanaa-fm']?.name, 'إذاعة اختبار');
    expect(contentRepository.radios['sanaa-fm']?.logoUrl, isNotEmpty);
    expect(contentRepository.radios['sanaa-fm']?.tag, '@sanaa_fm');
    expect(contentRepository.radios['sanaa-fm']?.englishName, 'Sanaa FM');
    expect(contentRepository.radios['sanaa-fm']?.disabled, isTrue);
    expect(find.text('تم حفظ الإذاعة'), findsOneWidget);

    await tester.ensureVisible(find.byTooltip('حذف الإذاعة'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('حذف الإذاعة'));
    await tester.pumpAndSettle();

    expect(contentRepository.radios.containsKey('sanaa-fm'), isTrue);

    await tester.tap(find.text('حذف').last);
    await tester.pumpAndSettle();

    expect(contentRepository.radios.containsKey('sanaa-fm'), isFalse);
    expect(find.text('تم حذف الإذاعة'), findsOneWidget);

    expect(find.text('إدارة برنامج'), findsOneWidget);

    await tester.ensureVisible(find.text('تعطيل البرنامج'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('تعطيل البرنامج'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('حفظ البرنامج'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('حفظ البرنامج'));
    await tester.pumpAndSettle();

    expect(contentRepository.programs['morning-sanaa']?.name, 'صباح هدهد');
    expect(contentRepository.programs['morning-sanaa']?.profileUrl, isNotEmpty);
    expect(contentRepository.programs['morning-sanaa']?.tag, 'morning');
    expect(contentRepository.programs['morning-sanaa']?.disabled, isTrue);
    expect(contentRepository.programs['morning-sanaa']?.categoryList, [
      'أخبار',
      'صباحي',
    ]);
    expect(find.text('تم حفظ البرنامج'), findsOneWidget);

    await tester.ensureVisible(find.byTooltip('حذف البرنامج'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('حذف البرنامج'));
    await tester.pumpAndSettle();

    expect(contentRepository.programs.containsKey('morning-sanaa'), isTrue);

    await tester.tap(find.text('حذف').last);
    await tester.pumpAndSettle();

    expect(contentRepository.programs.containsKey('morning-sanaa'), isFalse);
    expect(find.text('تم حذف البرنامج'), findsOneWidget);

    await tester.ensureVisible(find.text('إدارة حلقة'));
    await tester.pumpAndSettle();
    expect(find.text('إدارة حلقة'), findsOneWidget);

    await tester.enterText(
      find.widgetWithText(TextFormField, 'اسم الحلقة'),
      'حلقة اختبار',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'وقت البداية 1'),
      '10:30',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'أيام الأسبوع 1'),
      'MONDAY,TUESDAY',
    );
    await tester.ensureVisible(find.text('إضافة موعد'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('إضافة موعد'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.widgetWithText(TextFormField, 'وقت البداية 2'),
      '13:00',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'وقت النهاية 2'),
      '14:00',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'أيام الأسبوع 2'),
      'WEDNESDAY',
    );
    await tester.ensureVisible(find.text('تعطيل الحلقة'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('تعطيل الحلقة'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('حفظ الحلقة'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('حفظ الحلقة'));
    await tester.pumpAndSettle();

    expect(contentRepository.episodes['episode-1']?.name, 'حلقة اختبار');
    expect(contentRepository.episodes['episode-1']?.profileUrl, isNotEmpty);
    expect(contentRepository.episodes['episode-1']?.disabled, isTrue);
    expect(contentRepository.episodes['episode-1']?.schedule, hasLength(2));
    expect(
      contentRepository.episodes['episode-1']?.schedule.first.timeStart,
      '10:30',
    );
    expect(contentRepository.episodes['episode-1']?.schedule.first.weekdays, [
      'MONDAY',
      'TUESDAY',
    ]);
    expect(
      contentRepository.episodes['episode-1']?.schedule.last.timeStart,
      '13:00',
    );
    expect(contentRepository.episodes['episode-1']?.schedule.last.weekdays, [
      'WEDNESDAY',
    ]);
    expect(find.text('تم حفظ الحلقة'), findsOneWidget);

    await tester.ensureVisible(find.byTooltip('حذف الحلقة'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('حذف الحلقة'));
    await tester.pumpAndSettle();

    expect(contentRepository.episodes.containsKey('episode-1'), isTrue);

    await tester.tap(find.text('حذف').last);
    await tester.pumpAndSettle();

    expect(contentRepository.episodes.containsKey('episode-1'), isFalse);
    expect(find.text('تم حذف الحلقة'), findsOneWidget);
  });

  testWidgets('shows force update screen when required version is newer', (
    tester,
  ) async {
    final bootstrap = AppBootstrap(
      remoteConfigRepository: _ForcedUpdateRemoteConfigRepository(),
      appVersionRepository: _FixedAppVersionRepository(),
      authSessionRepository: InMemoryAuthSessionRepository(),
      radioRepository: InMemoryRadioRepository(),
    );

    await tester.pumpWidget(HudhudFmApp(bootstrap: bootstrap));
    await tester.pumpAndSettle();

    expect(find.text('يتطلب التطبيق تحديثًا'), findsOneWidget);
    expect(find.text('الإصدار الحالي: 1 · المطلوب: 99'), findsOneWidget);
    expect(find.text('إذاعة صنعاء'), findsNothing);
  });

  testWidgets('shows auth provider actions from remote config', (tester) async {
    tester.view.physicalSize = const Size(1000, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final profileRepository = InMemoryUserProfileRepository();
    final bootstrap = AppBootstrap(
      remoteConfigRepository: _AuthProvidersRemoteConfigRepository(),
      authSessionRepository: InMemoryAuthSessionRepository(),
      radioRepository: InMemoryRadioRepository(),
      userProfileRepository: profileRepository,
    );

    await tester.pumpWidget(HudhudFmApp(bootstrap: bootstrap));
    await tester.pumpAndSettle();

    await tester.tap(find.text('حسابي'));
    await tester.pumpAndSettle();

    expect(find.text('طرق الدخول'), findsOneWidget);
    expect(find.text('متابعة بحساب Google'), findsOneWidget);
    expect(find.text('متابعة برقم الهاتف'), findsOneWidget);
    expect(find.text('متابعة بحساب Facebook'), findsNothing);
    expect(find.text('متابعة بالبريد الإلكتروني'), findsNothing);

    await tester.tap(find.text('متابعة بحساب Google'));
    await tester.pumpAndSettle();

    expect(
      find.text('يتطلب هذا المزود إعداد Firebase قبل الاستخدام.'),
      findsOneWidget,
    );

    await tester.enterText(
      find.widgetWithText(TextFormField, 'الاسم'),
      'مستخدم هدهد',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'البريد الإلكتروني'),
      'user@example.com',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'رقم الهاتف'),
      '+967777777777',
    );
    await tester.ensureVisible(find.text('حفظ الملف الشخصي'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('حفظ الملف الشخصي'));
    await tester.pumpAndSettle();

    final profile = profileRepository.profiles['local-anonymous'];

    expect(profile?.name, 'مستخدم هدهد');
    expect(profile?.email, 'user@example.com');
    expect(profile?.mobile, '+967777777777');
    expect(find.text('تم حفظ الملف الشخصي'), findsOneWidget);
  });

  testWidgets('registers with email when email auth is enabled', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1000, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final bootstrap = AppBootstrap(
      remoteConfigRepository: _EmailAuthRemoteConfigRepository(),
      authSessionRepository: InMemoryAuthSessionRepository(),
      radioRepository: InMemoryRadioRepository(),
      userProfileRepository: InMemoryUserProfileRepository(),
    );

    await tester.pumpWidget(HudhudFmApp(bootstrap: bootstrap));
    await tester.pumpAndSettle();

    await tester.tap(find.text('حسابي'));
    await tester.pumpAndSettle();

    expect(find.text('متابعة بالبريد الإلكتروني'), findsOneWidget);

    await tester.tap(find.text('متابعة بالبريد الإلكتروني'));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.widgetWithText(TextFormField, 'البريد الإلكتروني').last,
      'user@example.com',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'كلمة المرور'),
      'secret123',
    );
    await tester.tap(find.text('إنشاء حساب'));
    await tester.pumpAndSettle();

    expect(find.text('تم إنشاء الحساب بالبريد الإلكتروني'), findsOneWidget);
    expect(find.text('مسجل'), findsOneWidget);
    expect(find.text('user@example.com'), findsWidgets);
  });
}

class _ForcedUpdateRemoteConfigRepository implements RemoteConfigRepository {
  @override
  Future<AppRemoteConfig> fetchRemoteConfig() async {
    return const AppRemoteConfig(
      requiredVersion: 99,
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
}

class _AuthProvidersRemoteConfigRepository implements RemoteConfigRepository {
  @override
  Future<AppRemoteConfig> fetchRemoteConfig() async {
    return const AppRemoteConfig(
      requiredVersion: 0,
      isTrialMode: false,
      isAdMobEnabled: false,
      adminMobile: '',
      developerReference: '',
      termsReference: '',
      googleAuthEnabled: true,
      emailAuthEnabled: false,
      facebookAuthEnabled: false,
      phoneAuthEnabled: true,
    );
  }
}

class _EmailAuthRemoteConfigRepository implements RemoteConfigRepository {
  @override
  Future<AppRemoteConfig> fetchRemoteConfig() async {
    return const AppRemoteConfig(
      requiredVersion: 0,
      isTrialMode: false,
      isAdMobEnabled: false,
      adminMobile: '',
      developerReference: '',
      termsReference: '',
      googleAuthEnabled: false,
      emailAuthEnabled: true,
      facebookAuthEnabled: false,
      phoneAuthEnabled: false,
    );
  }
}

class _FixedAppVersionRepository implements AppVersionRepository {
  @override
  Future<AppVersion> currentVersion() async {
    return const AppVersion(versionName: '1.0.0', buildNumber: 1);
  }
}
