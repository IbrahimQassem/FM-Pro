import 'package:hudhud_fm/features/account/domain/models/account_registration_result.dart';
import 'dart:typed_data';
import "package:flutter/material.dart";
import "package:flutter_localizations/flutter_localizations.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:flutter_test/flutter_test.dart";
import "package:hudhud_fm/app/providers.dart";
import "package:hudhud_fm/features/account/domain/models/account_sign_in_provider.dart";
import "package:hudhud_fm/features/account/domain/models/account_user.dart";
import "package:hudhud_fm/features/account/domain/repositories/account_repository.dart";
import "package:hudhud_fm/features/account/presentation/manage_account_screen.dart";
import "package:hudhud_fm/l10n/generated/app_localizations.dart";

void main() {
  testWidgets("requires password and explicit acknowledgement to delete",
      (tester) async {
    tester.view.physicalSize = const Size(800, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final repository = _FakeAccountRepository(user: _user);
    await tester.pumpWidget(_TestApp(repository: repository));
    await tester.pumpAndSettle();

    final delete = find.byKey(const Key("account-delete"));
    await tester.scrollUntilVisible(
      delete,
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(delete);
    await tester.pumpAndSettle();

    final confirm = find.byKey(const Key("account-confirm-delete"));
    expect(tester.widget<FilledButton>(confirm).onPressed, isNull);

    await tester.enterText(
      find.byKey(const Key("account-delete-password")),
      "secret-pass",
    );
    await tester.pump();
    expect(tester.widget<FilledButton>(confirm).onPressed, isNull);

    await tester.tap(find.byKey(const Key("account-delete-acknowledgement")));
    await tester.pump();
    expect(tester.widget<FilledButton>(confirm).onPressed, isNotNull);

    await tester.tap(confirm);
    await tester.pumpAndSettle();

    expect(repository.deletionPassword, "secret-pass");
  });

  testWidgets("unverified account enters and submits a six digit code",
      (tester) async {
    tester.view.physicalSize = const Size(800, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final repository = _FakeAccountRepository(user: _unverifiedUser);
    await tester.pumpWidget(_TestApp(repository: repository));
    await tester.pumpAndSettle();

    final verify = find.byKey(const Key("account-verify-email"));
    expect(tester.widget<FilledButton>(verify).onPressed, isNull);
    await tester.enterText(
      find.byKey(const Key("account-verification-code")),
      "123456",
    );
    await tester.pump();
    expect(tester.widget<FilledButton>(verify).onPressed, isNotNull);
    await tester.tap(verify);
    await tester.pump();
    expect(repository.verificationCode, "123456");
  });

  testWidgets("provider account without email can request a code for an email",
      (tester) async {
    tester.view.physicalSize = const Size(800, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final repository = _FakeAccountRepository(user: _socialWithoutEmail);
    await tester.pumpWidget(_TestApp(repository: repository));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.byKey(const Key("account-verification-email")),
      "social@example.com",
    );
    final resend = find.byKey(const Key("account-resend-code"));
    await tester.scrollUntilVisible(
      resend,
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(resend);
    await tester.pump();

    expect(repository.requestedEmail, "social@example.com");
  });

  testWidgets("can sign out from manage account screen", (tester) async {
    tester.view.physicalSize = const Size(800, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final repository = _FakeAccountRepository(user: _user);
    await tester.pumpWidget(_TestApp(repository: repository));
    await tester.pumpAndSettle();

    final signOutButton = find.byKey(const Key("account-sign-out"));
    await tester.scrollUntilVisible(
      signOutButton,
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(signOutButton);
    await tester.pump();

    expect(repository.signedOut, isTrue);
  });

  testWidgets(
      "can open edit profile sheet and save new display name and mascot",
      (tester) async {
    tester.view.physicalSize = const Size(800, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final repository = _FakeAccountRepository(user: _user);
    await tester.pumpWidget(_TestApp(repository: repository));
    await tester.pumpAndSettle();

    final editButton = find.byKey(const Key("edit-profile-button"));
    expect(editButton, findsOneWidget);
    await tester.tap(editButton);
    await tester.pumpAndSettle();

    expect(find.byKey(const Key("edit-display-name")), findsOneWidget);
    await tester.enterText(
        find.byKey(const Key("edit-display-name")), "Ahmed Updated");
    await tester.tap(find.byKey(const Key("mascot-avatar-1")));
    await tester.pump();

    final saveButton = find.byKey(const Key("save-profile-button"));
    await tester.tap(saveButton);
    await tester.pumpAndSettle();

    expect(repository.updatedDisplayName, "Ahmed Updated");
    expect(repository.updatedPhotoUrl,
        "assets/images/mascot/mascot_onboarding.webp");
  });

  for (final locale in [const Locale('en'), const Locale('ar')]) {
    for (final failure in [
      AccountFailure.verificationDeliveryFailed,
      AccountFailure.verificationRateLimited
    ]) {
      testWidgets(
          'resend $failure clears stale success at 200% ${locale.languageCode}',
          (tester) async {
        tester.view.physicalSize = const Size(1200, 3000);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final repository = _FakeAccountRepository(user: _unverifiedUser);
        await tester.pumpWidget(
            _TestApp(repository: repository, locale: locale, textScale: 2));
        await tester.pumpAndSettle();
        final resend = find.byKey(const Key('account-resend-code'));
        await tester.ensureVisible(resend);
        await tester.tap(resend);
        await tester.pumpAndSettle();
        final context = tester.element(find.byType(ManageAccountScreen));
        final strings = AppLocalizations.of(context);
        expect(find.text(strings.verificationCodeSent), findsOneWidget);
        repository.deliveryFailure = failure;
        await tester.ensureVisible(resend);
        await tester.tap(resend);
        await tester.pumpAndSettle();
        expect(find.text(strings.verificationCodeSent), findsNothing);
        expect(
            find.text(failure == AccountFailure.verificationRateLimited
                ? strings.verificationRateLimited
                : strings.verificationDeliveryFailed),
            findsOneWidget);
        expect(tester.widget<TextButton>(resend).onPressed, isNotNull);
        expect(
            ProviderScope.containerOf(context)
                .read(accountControllerProvider)
                .user
                ?.emailVerified,
            false);
        expect(
            Directionality.of(context),
            locale.languageCode == 'ar'
                ? TextDirection.rtl
                : TextDirection.ltr);
        repository.deliveryFailure = null;
        await tester.ensureVisible(resend);
        await tester.tap(resend);
        await tester.pumpAndSettle();
        expect(find.text(strings.verificationCodeSent), findsOneWidget);
        expect(
            find.text(failure == AccountFailure.verificationRateLimited
                ? strings.verificationRateLimited
                : strings.verificationDeliveryFailed),
            findsNothing);
        expect(repository.requestCalls, 3);
        expect(repository.registerCalls, 0);
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
        home: const ManageAccountScreen(),
      ),
    );
  }
}

class _FakeAccountRepository implements AccountRepository {
  _FakeAccountRepository({this.user = _user});

  final AccountUser? user;
  AccountFailure? deliveryFailure;
  int requestCalls = 0;
  int registerCalls = 0;
  String? deletionPassword;
  String? verificationCode;
  String? requestedEmail;
  bool signedOut = false;
  String? updatedDisplayName;
  String? updatedPhotoUrl;

  @override
  Stream<AccountUser?> watchAccount() => Stream.value(user);

  @override
  Future<void> deleteAccount({String? currentPassword}) async {
    deletionPassword = currentPassword;
  }

  @override
  Future<void> requestEmailVerificationCode({String? email}) async {
    requestCalls++;
    requestedEmail = email;
    if (deliveryFailure case final failure?) throw AccountException(failure);
  }

  @override
  Future<void> verifyEmailCode(String code) async {
    verificationCode = code;
  }

  @override
  Future<void> continueWithProvider(AccountSignInProvider provider) async {}
  @override
  Future<AccountRegistrationResult> register(
      {required String displayName,
      required String email,
      required String password}) async {
    registerCalls++;
    return const AccountRegistrationResult(
        verificationDelivery: AccountVerificationDelivery.sent);
  }

  @override
  Future<void> sendPasswordReset(String email) async {}
  @override
  Future<void> signIn(
      {required String email, required String password}) async {}
  @override
  Future<void> signOut() async {
    signedOut = true;
  }

  @override
  Future<void> updateProfile({
    required String displayName,
    String? photoUrl,
    Uint8List? photoBytes,
  }) async {
    updatedDisplayName = displayName;
    updatedPhotoUrl = photoUrl;
  }
}

const _user = AccountUser(
  uid: "user-1",
  displayName: "Listener",
  email: "listener@example.com",
  emailVerified: true,
  linkedProviders: {AccountSignInProvider.password},
);

const _unverifiedUser = AccountUser(
  uid: "user-2",
  displayName: "New listener",
  email: "new@example.com",
);

const _socialWithoutEmail = AccountUser(
  uid: "user-3",
  displayName: "Social listener",
  email: "",
  linkedProviders: {AccountSignInProvider.facebook},
);
