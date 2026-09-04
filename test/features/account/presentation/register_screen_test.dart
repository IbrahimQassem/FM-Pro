import "package:flutter/material.dart";
import "package:flutter_localizations/flutter_localizations.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:flutter_test/flutter_test.dart";
import "package:hudhud_fm/app/providers.dart";
import "package:hudhud_fm/features/account/domain/models/account_sign_in_provider.dart";
import "package:hudhud_fm/features/account/domain/models/account_user.dart";
import "package:hudhud_fm/features/account/domain/repositories/account_repository.dart";
import "package:hudhud_fm/features/account/presentation/register_screen.dart";
import "package:hudhud_fm/features/account/presentation/sign_in_screen.dart";
import "package:hudhud_fm/l10n/generated/app_localizations.dart";

void main() {
  testWidgets("registers with valid name, email and password", (tester) async {
    tester.view.physicalSize = const Size(800, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final repository = _FakeAccountRepository();
    await tester.pumpWidget(_TestApp(repository: repository));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.byKey(const Key("account-name")),
      "Ahmed Ali",
    );
    await tester.enterText(
      find.byKey(const Key("account-email")),
      "ahmed@example.com",
    );
    await tester.enterText(
      find.byKey(const Key("account-password")),
      "password123",
    );
    await tester.tap(find.byKey(const Key("account-submit")));
    await tester.pump();

    expect(repository.registeredName, "Ahmed Ali");
    expect(repository.registeredEmail, "ahmed@example.com");
    expect(repository.registeredPassword, "password123");
  });

  testWidgets("can navigate to SignInScreen via go-to-sign-in-button", (tester) async {
    tester.view.physicalSize = const Size(800, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final repository = _FakeAccountRepository();
    await tester.pumpWidget(_TestApp(repository: repository));
    await tester.pumpAndSettle();

    final signInButton = find.byKey(const Key("go-to-sign-in-button"));
    expect(signInButton, findsOneWidget);

    await tester.tap(signInButton);
    await tester.pumpAndSettle();

    expect(find.byType(SignInScreen), findsOneWidget);
  });

  testWidgets("starts Google sign in from RegisterScreen", (tester) async {
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
        home: RegisterScreen(),
      ),
    );
  }
}

class _FakeAccountRepository implements AccountRepository {
  AccountSignInProvider? provider;
  String? registeredName;
  String? registeredEmail;
  String? registeredPassword;

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
  Future<void> register({
    required String displayName,
    required String email,
    required String password,
  }) async {
    registeredName = displayName;
    registeredEmail = email;
    registeredPassword = password;
  }
  @override
  Future<void> sendPasswordReset(String email) async {}
  @override
  Future<void> signIn({
    required String email,
    required String password,
  }) async {}
  @override
  Future<void> signOut() async {}
  @override
  Future<void> updateProfile({required String displayName, String? photoUrl}) async {}
}
