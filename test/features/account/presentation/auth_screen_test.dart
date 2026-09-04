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
  testWidgets("guest can start Google or Facebook sign in from AuthScreen", (tester) async {
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

    await tester.tap(find.byKey(const Key("account-facebook")));
    await tester.pump();
    expect(repository.provider, AccountSignInProvider.facebook);
  });

  testWidgets("iOS offers Apple sign in on AuthScreen", (tester) async {
    tester.view.physicalSize = const Size(800, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
    addTearDown(() => debugDefaultTargetPlatformOverride = null);

    final repository = _FakeAccountRepository();
    await tester.pumpWidget(_TestApp(repository: repository));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key("account-apple")), findsOneWidget);
    await tester.tap(find.byKey(const Key("account-apple")));
    await tester.pump();

    expect(repository.provider, AccountSignInProvider.apple);
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
    await tester.tap(find.byKey(const Key("account-switch-mode")));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key("account-name")), findsOneWidget);
  });

  testWidgets("can open UGC guidelines from AuthScreen", (tester) async {
    tester.view.physicalSize = const Size(800, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final repository = _FakeAccountRepository();
    await tester.pumpWidget(_TestApp(repository: repository));
    await tester.pumpAndSettle();

    final guidelinesButton = find.byKey(const Key("account-auth-ugc-guidelines"));
    expect(guidelinesButton, findsOneWidget);

    await tester.tap(guidelinesButton);
    await tester.pumpAndSettle();

    expect(find.text("شروط المشاركة والتعليقات"), findsOneWidget);
  });
}

class _TestApp extends StatelessWidget {
  const _TestApp({required this.repository});

  final AccountRepository repository;

  @override
  Widget build(BuildContext context) {
    return ProviderScope(
      overrides: [accountRepositoryProvider.overrideWithValue(repository)],
      child: const MaterialApp(
        locale: Locale("ar"),
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        home: AuthScreen(),
      ),
    );
  }
}

class _FakeAccountRepository implements AccountRepository {
  AccountSignInProvider? provider;

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
  Future<void> register({required String displayName, required String email, required String password}) async {}
  @override
  Future<void> sendPasswordReset(String email) async {}
  @override
  Future<void> signIn({required String email, required String password}) async {}
  @override
  Future<void> signOut() async {}
}
