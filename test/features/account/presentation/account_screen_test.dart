import 'dart:typed_data';
import "package:flutter/material.dart";
import "package:flutter_localizations/flutter_localizations.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:flutter_test/flutter_test.dart";
import "package:hudhud_fm/core/config/app_config.dart";
import "package:hudhud_fm/features/account/presentation/widgets/contact_us_dialog.dart";
import "package:hudhud_fm/app/providers.dart";
import "package:hudhud_fm/features/account/domain/models/account_sign_in_provider.dart";
import "package:hudhud_fm/features/account/domain/models/account_user.dart";
import "package:hudhud_fm/features/account/domain/repositories/account_repository.dart";
import "package:hudhud_fm/features/account/presentation/account_screen.dart";
import "package:hudhud_fm/features/account/presentation/manage_account_screen.dart";
import "package:hudhud_fm/features/account/presentation/register_screen.dart";
import "package:hudhud_fm/features/account/presentation/sign_in_screen.dart";
import "package:hudhud_fm/features/account/presentation/widgets/about_app_dialog.dart";
import "package:hudhud_fm/features/onboarding/presentation/onboarding_screen.dart";
import "package:hudhud_fm/features/settings/domain/repositories/settings_repository.dart";
import "package:hudhud_fm/l10n/generated/app_localizations.dart";

void main() {
  testWidgets("guest sees guest card and can open SignInScreen",
      (tester) async {
    final repository = _FakeAccountRepository(user: null);
    await tester.pumpWidget(_TestApp(repository: repository));
    await tester.pumpAndSettle();

    expect(find.text("مرحباً بك في هدهد FM"), findsOneWidget);
    final openSignInButton = find.byKey(const Key("open-sign-in-button"));
    expect(openSignInButton, findsOneWidget);

    await tester.tap(openSignInButton);
    await tester.pumpAndSettle();

    expect(find.byType(SignInScreen), findsOneWidget);
  });

  testWidgets("guest can open RegisterScreen from guest card", (tester) async {
    final repository = _FakeAccountRepository(user: null);
    await tester.pumpWidget(_TestApp(repository: repository));
    await tester.pumpAndSettle();

    final openRegisterButton = find.byKey(const Key("open-register-button"));
    expect(openRegisterButton, findsOneWidget);

    await tester.tap(openRegisterButton);
    await tester.pumpAndSettle();

    expect(find.byType(RegisterScreen), findsOneWidget);
  });

  testWidgets("verified user sees profile and can open ManageAccountScreen",
      (tester) async {
    final repository = _FakeAccountRepository(user: _user);
    await tester.pumpWidget(_TestApp(repository: repository));
    await tester.pumpAndSettle();

    expect(find.text("Listener"), findsOneWidget);
    expect(find.text("listener@example.com"), findsOneWidget);

    final manageButton = find.byKey(const Key("open-manage-account-button"));
    expect(manageButton, findsOneWidget);

    await tester.tap(manageButton);
    await tester.pumpAndSettle();

    expect(find.byType(ManageAccountScreen), findsOneWidget);
  });

  testWidgets("can open rate app dialog from Settings Hub", (tester) async {
    final repository = _FakeAccountRepository(user: _user);
    await tester.pumpWidget(_TestApp(repository: repository));
    await tester.pumpAndSettle();

    final rateTile = find.byKey(const Key("account-rate-app"));
    await tester.ensureVisible(rateTile);
    await tester.pumpAndSettle();
    expect(rateTile, findsOneWidget);

    await tester.tap(rateTile);
    await tester.pumpAndSettle();

    expect(find.text("ما رأيك في هدهد FM؟"), findsOneWidget);
  });

  testWidgets("can open about app dialog from Settings Hub", (tester) async {
    final repository = _FakeAccountRepository(user: _user);
    await tester.pumpWidget(_TestApp(repository: repository));
    await tester.pumpAndSettle();

    final aboutTile = find.byKey(const Key("account-about-app"));
    await tester.scrollUntilVisible(aboutTile, 250);
    await tester.drag(find.byType(ListView), const Offset(0, -150));
    await tester.pumpAndSettle();
    expect(aboutTile, findsOneWidget);

    await tester.tap(aboutTile);
    await tester.pumpAndSettle();

    expect(find.byType(AboutAppDialog), findsOneWidget);
    expect(
        find.descendant(
            of: find.byType(AboutAppDialog),
            matching: find.textContaining("${AppConfig.currentVersionName} (${AppConfig.currentVersionCode})")),
        findsOneWidget);
  });

  testWidgets("can open Contact Us dialog from Settings Hub", (tester) async {
    final repository = _FakeAccountRepository(user: _user);
    await tester.pumpWidget(_TestApp(repository: repository));
    await tester.pumpAndSettle();

    final contactTile = find.byKey(const Key("account-contact-us"));
    await tester.scrollUntilVisible(contactTile, 250);
    await tester.drag(find.byType(ListView), const Offset(0, -150));
    await tester.pumpAndSettle();
    expect(contactTile, findsOneWidget);

    await tester.tap(contactTile);
    await tester.pumpAndSettle();

    expect(find.byType(ContactUsDialog), findsOneWidget);
    expect(find.byKey(const Key("contact-whatsapp")), findsOneWidget);
  });

  testWidgets("can open UGC guidelines from Settings Hub", (tester) async {
    final repository = _FakeAccountRepository(user: _user);
    await tester.pumpWidget(_TestApp(repository: repository));
    await tester.pumpAndSettle();

    final guidelinesTile = find.byKey(const Key("account-ugc-guidelines"));
    await tester.scrollUntilVisible(guidelinesTile, 250);
    await tester.drag(find.byType(ListView), const Offset(0, -150));
    await tester.pumpAndSettle();
    expect(guidelinesTile.hitTestable(), findsOneWidget);
    await tester.tap(guidelinesTile);
    await tester.pumpAndSettle();

    expect(find.text("شروط المشاركة والتعليقات"), findsOneWidget);
    expect(find.text("إرشادات هدهد لمجتمع محترم وآمن"), findsOneWidget);
  });

  testWidgets("can open app tour from Settings Hub", (tester) async {
    final repository = _FakeAccountRepository(user: _user);
    await tester.pumpWidget(_TestApp(repository: repository));
    await tester.pumpAndSettle();

    final appTourTile = find.byKey(const Key("account-app-tour"));
    await tester.ensureVisible(appTourTile);
    await tester.pumpAndSettle();
    expect(appTourTile, findsOneWidget);

    await tester.tap(appTourTile);
    await tester.pumpAndSettle();

    expect(find.byType(OnboardingScreen), findsOneWidget);
  });

  testWidgets("shows App Preferences section and opens language selection sheet",
      (tester) async {
    final repository = _FakeAccountRepository(user: _user);
    final settingsRepo = _FakeSettingsRepository();
    await tester.pumpWidget(_TestApp(
      repository: repository,
      settingsRepository: settingsRepo,
    ));
    await tester.pumpAndSettle();

    expect(find.text("تفضيلات التطبيق"), findsOneWidget);
    final languageTile = find.byKey(const Key("account-language-setting"));
    expect(languageTile, findsOneWidget);

    await tester.tap(languageTile);
    await tester.pumpAndSettle();

    expect(find.text("اختيار اللغة"), findsOneWidget);
    final englishOption = find.byKey(const Key("language-option-en"));
    expect(englishOption, findsOneWidget);

    await tester.tap(englishOption);
    await tester.pumpAndSettle();

    expect(await settingsRepo.getLocale(), const Locale('en'));
  });

  testWidgets("shows App Preferences section and opens appearance selection sheet",
      (tester) async {
    final repository = _FakeAccountRepository(user: _user);
    final settingsRepo = _FakeSettingsRepository();
    await tester.pumpWidget(_TestApp(
      repository: repository,
      settingsRepository: settingsRepo,
    ));
    await tester.pumpAndSettle();

    final themeTile = find.byKey(const Key("account-theme-setting"));
    expect(themeTile, findsOneWidget);

    await tester.tap(themeTile);
    await tester.pumpAndSettle();

    expect(find.text("اختيار المظهر"), findsOneWidget);
    final darkOption = find.byKey(const Key("theme-option-dark"));
    expect(darkOption, findsOneWidget);

    await tester.tap(darkOption);
    await tester.pumpAndSettle();

    expect(await settingsRepo.getThemeMode(), ThemeMode.dark);
  });
}

class _TestApp extends StatelessWidget {
  const _TestApp({
    required this.repository,
    this.settingsRepository,
  });

  final AccountRepository repository;
  final SettingsRepository? settingsRepository;

  @override
  Widget build(BuildContext context) {
    return ProviderScope(
      overrides: [
        accountRepositoryProvider.overrideWithValue(repository),
        if (settingsRepository != null)
          settingsRepositoryProvider.overrideWithValue(settingsRepository!),
      ],
      child: const MaterialApp(
        locale: Locale("ar"),
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        home: AccountScreen(),
      ),
    );
  }
}

class _FakeSettingsRepository implements SettingsRepository {
  ThemeMode themeMode = ThemeMode.system;
  Locale locale = const Locale('ar');

  @override
  Future<ThemeMode> getThemeMode() async => themeMode;

  @override
  Future<void> setThemeMode(ThemeMode mode) async {
    themeMode = mode;
  }

  @override
  Future<Locale> getLocale() async => locale;

  @override
  Future<void> setLocale(Locale newLocale) async {
    locale = newLocale;
  }
}

class _FakeAccountRepository implements AccountRepository {
  _FakeAccountRepository({this.user = _user});

  final AccountUser? user;

  @override
  Stream<AccountUser?> watchAccount() => Stream.value(user);

  @override
  Future<void> deleteAccount({String? currentPassword}) async {}
  @override
  Future<void> requestEmailVerificationCode({String? email}) async {}
  @override
  Future<void> verifyEmailCode(String code) async {}
  @override
  Future<void> continueWithProvider(AccountSignInProvider provider) async {}
  @override
  Future<void> register(
      {required String displayName,
      required String email,
      required String password}) async {}
  @override
  Future<void> sendPasswordReset(String email) async {}
  @override
  Future<void> signIn(
      {required String email, required String password}) async {}
  @override
  Future<void> signOut() async {}
  @override
  Future<void> updateProfile({
    required String displayName,
    String? photoUrl,
    Uint8List? photoBytes,
  }) async {}
}

const _user = AccountUser(
  uid: "user-1",
  displayName: "Listener",
  email: "listener@example.com",
  emailVerified: true,
  linkedProviders: {AccountSignInProvider.password},
);
