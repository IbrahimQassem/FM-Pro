import 'package:hudhud_fm/features/account/domain/models/account_registration_result.dart';
import "package:flutter/foundation.dart";
import "package:flutter/material.dart";
import "package:flutter_localizations/flutter_localizations.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:flutter_test/flutter_test.dart";
import "package:hudhud_fm/app/providers.dart";
import "package:hudhud_fm/features/account/domain/models/account_sign_in_provider.dart";
import "package:hudhud_fm/features/account/domain/models/account_user.dart";
import "package:hudhud_fm/features/account/domain/repositories/account_repository.dart";
import "package:hudhud_fm/features/account/presentation/auth_screen.dart";
import "package:hudhud_fm/l10n/generated/app_localizations.dart";

void main() {
  testWidgets("guest can start Google sign in from AuthScreen", (tester) async {
    tester.view.physicalSize = const Size(800, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final repository = _FakeAccountRepository();
    await tester.pumpWidget(_TestApp(repository: repository));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key("account-google")));
    await tester.pump();
    expect(repository.provider, AccountSignInProvider.google);

    expect(find.byKey(const Key("account-facebook")), findsNothing);
  });

  testWidgets("Apple sign in is hidden on AuthScreen", (tester) async {
    tester.view.physicalSize = const Size(800, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
    addTearDown(() => debugDefaultTargetPlatformOverride = null);

    final repository = _FakeAccountRepository();
    await tester.pumpWidget(_TestApp(repository: repository));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key("account-apple")), findsNothing);
    debugDefaultTargetPlatformOverride = null;
  });

  testWidgets("can toggle between sign in and register modes", (tester) async {
    tester.view.physicalSize = const Size(800, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final repository = _FakeAccountRepository();
    await tester.pumpWidget(_TestApp(repository: repository));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key("account-name")), findsNothing);
    expect(find.byKey(const Key("account-confirm-password")), findsNothing);
    await tester.tap(find.byKey(const Key("account-switch-mode")));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key("account-name")), findsOneWidget);
    expect(find.byKey(const Key("account-confirm-password")), findsOneWidget);
  });

  testWidgets("can open UGC guidelines from AuthScreen", (tester) async {
    tester.view.physicalSize = const Size(800, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final repository = _FakeAccountRepository();
    await tester.pumpWidget(_TestApp(repository: repository));
    await tester.pumpAndSettle();

    final guidelinesButton =
        find.byKey(const Key("account-auth-ugc-guidelines"));
    expect(guidelinesButton, findsOneWidget);

    await tester.tap(guidelinesButton);
    await tester.pumpAndSettle();

    expect(find.text("شروط المشاركة والتعليقات"), findsOneWidget);
  });

  for (final locale in [const Locale('en'), const Locale('ar')]) {
    for (final delivery in [
      AccountVerificationDelivery.failed,
      AccountVerificationDelivery.rateLimited
    ]) {
      testWidgets(
          'registration $delivery uses safe feedback at 200% ${locale.languageCode}',
          (tester) async {
        tester.view.physicalSize = const Size(1200, 3000);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final repository = _FakeAccountRepository()..delivery = delivery;
        await tester.pumpWidget(
            _TestApp(repository: repository, locale: locale, textScale: 2));
        await tester.pumpAndSettle();
        await tester.tap(find.byKey(const Key('account-switch-mode')));
        await tester.pumpAndSettle();
        for (final field in {
          'account-name': 'Synthetic listener',
          'account-email': 'new@example.test',
          'account-password': 'test-only-password',
          'account-confirm-password': 'test-only-password'
        }.entries) {
          await tester.ensureVisible(find.byKey(Key(field.key)));
          await tester.enterText(find.byKey(Key(field.key)), field.value);
        }
        await tester.ensureVisible(find.byKey(const Key('account-submit')));
        await tester.tap(find.byKey(const Key('account-submit')));
        await tester.pumpAndSettle();
        final strings =
            AppLocalizations.of(tester.element(find.byType(AuthScreen)));
        expect(
            find.text(delivery == AccountVerificationDelivery.rateLimited
                ? strings.verificationRateLimited
                : strings.verificationDeliveryFailed),
            findsOneWidget);
        expect(find.text(strings.verificationCodeSent), findsNothing);
        expect(repository.registerCalls, 1);
        final context = tester.element(find.byType(AuthScreen));
        expect(
            Directionality.of(context),
            locale.languageCode == 'ar'
                ? TextDirection.rtl
                : TextDirection.ltr);
        final controller = ProviderScope.containerOf(context)
            .read(accountControllerProvider.notifier);
        await controller.register(
            displayName: 'Duplicate',
            email: 'new@example.test',
            password: 'test-only');
        expect(repository.registerCalls, 1);
        expect(tester.takeException(), isNull);
      });
    }
  }
}

class _TestApp extends StatelessWidget {
  const _TestApp(
      {required this.repository,
      this.locale = const Locale("ar"),
      this.textScale = 1});

  final Locale locale;
  final double textScale;

  final AccountRepository repository;

  @override
  Widget build(BuildContext context) {
    return ProviderScope(
      overrides: [accountRepositoryProvider.overrideWithValue(repository)],
      child: MaterialApp(
        locale: locale,
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context)
                .copyWith(textScaler: TextScaler.linear(textScale)),
            child: child!),
        home: const AuthScreen(),
      ),
    );
  }
}

class _FakeAccountRepository implements AccountRepository {
  AccountSignInProvider? provider;
  int registerCalls = 0;
  AccountVerificationDelivery delivery = AccountVerificationDelivery.sent;

  @override
  Stream<AccountUser?> watchAccount() => Stream.value(null);

  @override
  Future<void> continueWithProvider(AccountSignInProvider provider) async {
    this.provider = provider;
  }

  @override
  Future<void> deleteAccount({String? currentPassword}) async {}
  @override
  Future<void> requestEmailVerificationCode({String? email}) async {}
  @override
  Future<void> verifyEmailCode(String code) async {}
  @override
  Future<AccountRegistrationResult> register(
      {required String displayName,
      required String email,
      required String password}) async {
    registerCalls++;
    return AccountRegistrationResult(verificationDelivery: delivery);
  }

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
