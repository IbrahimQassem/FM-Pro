import "package:hudhud_fm/features/account/presentation/widgets/about_app_dialog.dart";
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/app/providers.dart';
import 'package:hudhud_fm/features/account/domain/models/account_user.dart';
import 'package:hudhud_fm/features/account/domain/models/account_sign_in_provider.dart';
import 'package:hudhud_fm/features/account/domain/repositories/account_repository.dart';
import 'package:hudhud_fm/features/account/presentation/account_screen.dart';
import 'package:hudhud_fm/l10n/generated/app_localizations.dart';

void main() {
  testWidgets('requires password and explicit acknowledgement to delete', (
    tester,
  ) async {
    final repository = _FakeAccountRepository();
    await tester.pumpWidget(_TestApp(repository: repository));
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.byKey(const Key('account-delete')),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.byKey(const Key('account-delete')));
    await tester.pumpAndSettle();
    final confirm = find.byKey(const Key('account-confirm-delete'));
    expect(tester.widget<FilledButton>(confirm).onPressed, isNull);

    await tester.enterText(
      find.byKey(const Key('account-delete-password')),
      'current-password',
    );
    await tester.tap(find.byKey(const Key('account-delete-acknowledgement')));
    await tester.pump();
    expect(tester.widget<FilledButton>(confirm).onPressed, isNotNull);
    await tester.tap(confirm);
    await tester.pumpAndSettle();

    expect(repository.deletionPassword, 'current-password');
    expect(find.text('تم حذف حسابك وبياناتك المرتبطة.'), findsOneWidget);
  });

  testWidgets('deletion dialog fits a small screen at 200% text scale', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(640, 1136);
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      _TestApp(
        repository: _FakeAccountRepository(),
        textScaler: const TextScaler.linear(2),
      ),
    );
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.byKey(const Key('account-delete')),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.byKey(const Key('account-delete')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('account-delete-password')), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('unverified account enters and submits a six digit code', (
    tester,
  ) async {
    final repository = _FakeAccountRepository(user: _unverifiedUser);
    await tester.pumpWidget(_TestApp(repository: repository));
    await tester.pumpAndSettle();

    final verify = find.byKey(const Key('account-verify-email'));
    expect(tester.widget<FilledButton>(verify).onPressed, isNull);
    await tester.enterText(
      find.byKey(const Key('account-verification-code')),
      '123456',
    );
    await tester.pump();
    expect(tester.widget<FilledButton>(verify).onPressed, isNotNull);
    await tester.tap(verify);
    await tester.pump();
    expect(repository.verificationCode, '123456');
  });

  testWidgets('guest can start Google or Facebook sign in', (tester) async {
    final repository = _FakeAccountRepository(user: null);
    await tester.pumpWidget(_TestApp(repository: repository));
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.byKey(const Key('account-google')),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.byKey(const Key('account-google')));
    await tester.pump();
    expect(repository.provider, AccountSignInProvider.google);
    await tester.tap(find.byKey(const Key('account-facebook')));
    await tester.pump();
    expect(repository.provider, AccountSignInProvider.facebook);
  });

  testWidgets(
    'provider account without email can request a code for an email',
    (tester) async {
      final repository = _FakeAccountRepository(user: _socialWithoutEmail);
      await tester.pumpWidget(_TestApp(repository: repository));
      await tester.pumpAndSettle();

      await tester.enterText(
        find.byKey(const Key('account-verification-email')),
        'social@example.com',
      );
      await tester.scrollUntilVisible(
        find.byKey(const Key('account-resend-code')),
        300,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.byKey(const Key('account-resend-code')));
      await tester.pump();

      expect(repository.requestedEmail, 'social@example.com');
    },
  );

  testWidgets('iOS offers Apple sign in and delegates the action', (
    tester,
  ) async {
    debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
    addTearDown(() => debugDefaultTargetPlatformOverride = null);
    final repository = _FakeAccountRepository(user: null);
    await tester.pumpWidget(_TestApp(repository: repository));
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.byKey(const Key('account-apple')),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.byKey(const Key('account-apple')));
    await tester.pump();

    expect(repository.provider, AccountSignInProvider.apple);
    debugDefaultTargetPlatformOverride = null;
  });

  testWidgets('can open UGC guidelines from unauthenticated account screen', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final repository = _FakeAccountRepository(user: null);
    await tester.pumpWidget(_TestApp(repository: repository));
    await tester.pumpAndSettle();

    final guidelinesButton = find.byKey(
      const Key('account-auth-ugc-guidelines'),
    );
    expect(guidelinesButton, findsOneWidget);

    await tester.tap(guidelinesButton);
    await tester.pumpAndSettle();

    expect(find.text('شروط المشاركة والتعليقات'), findsOneWidget);
    expect(find.text('إرشادات هدهد لمجتمع محترم وآمن'), findsOneWidget);
  });

  testWidgets('can open UGC guidelines from verified account screen', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final repository = _FakeAccountRepository(user: _user);
    await tester.pumpWidget(_TestApp(repository: repository));
    await tester.pumpAndSettle();

    final guidelinesTile = find.byKey(const Key('account-ugc-guidelines'));
    expect(guidelinesTile, findsOneWidget);

    await tester.tap(guidelinesTile);
    await tester.pumpAndSettle();

    expect(find.text('شروط المشاركة والتعليقات'), findsOneWidget);
    expect(find.text('إرشادات هدهد لمجتمع محترم وآمن'), findsOneWidget);
  });

  testWidgets("can open rate app dialog from verified account screen", (tester) async {
    tester.view.physicalSize = const Size(800, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final repository = _FakeAccountRepository(user: _user);
    await tester.pumpWidget(_TestApp(repository: repository));
    await tester.pumpAndSettle();

    final rateTile = find.byKey(const Key("account-rate-app"));
    expect(rateTile, findsOneWidget);

    await tester.tap(rateTile);
    await tester.pumpAndSettle();

    expect(find.text("ما رأيك في هدهد FM؟"), findsOneWidget);
  });

  testWidgets("can open about app dialog from verified account screen", (tester) async {
    tester.view.physicalSize = const Size(800, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final repository = _FakeAccountRepository(user: _user);
    await tester.pumpWidget(_TestApp(repository: repository));
    await tester.pumpAndSettle();

    final aboutTile = find.byKey(const Key("account-about-app"));
    expect(aboutTile, findsOneWidget);

    await tester.tap(aboutTile);
    await tester.pumpAndSettle();

    expect(find.byType(AboutAppDialog), findsOneWidget);
    expect(find.textContaining("1.0.0 (1)"), findsOneWidget);
  });
}


class _TestApp extends StatelessWidget {
  const _TestApp({required this.repository, this.textScaler});

  final AccountRepository repository;
  final TextScaler? textScaler;

  @override
  Widget build(BuildContext context) {
    return ProviderScope(
      overrides: [accountRepositoryProvider.overrideWithValue(repository)],
      child: MaterialApp(
        locale: const Locale('ar'),
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        builder: textScaler == null
            ? null
            : (context, child) => MediaQuery(
                data: MediaQuery.of(context).copyWith(textScaler: textScaler),
                child: child!,
              ),
        home: const AccountScreen(),
      ),
    );
  }
}

class _FakeAccountRepository implements AccountRepository {
  _FakeAccountRepository({this.user = _user});

  final AccountUser? user;
  String? deletionPassword;
  String? verificationCode;
  String? requestedEmail;
  AccountSignInProvider? provider;

  @override
  Stream<AccountUser?> watchAccount() => Stream.value(user);

  @override
  Future<void> deleteAccount({String? currentPassword}) async {
    deletionPassword = currentPassword;
  }

  @override
  Future<void> requestEmailVerificationCode({String? email}) async {
    requestedEmail = email;
  }

  @override
  Future<void> verifyEmailCode(String code) async {
    verificationCode = code;
  }

  @override
  Future<void> continueWithProvider(AccountSignInProvider provider) async {
    this.provider = provider;
  }

  @override
  Future<void> register({
    required String displayName,
    required String email,
    required String password,
  }) async {}

  @override
  Future<void> sendPasswordReset(String email) async {}

  @override
  Future<void> signIn({
    required String email,
    required String password,
  }) async {}

  @override
  Future<void> signOut() async {}
}

const _user = AccountUser(
  uid: 'user-1',
  displayName: 'Listener',
  email: 'listener@example.com',
  emailVerified: true,
  linkedProviders: {AccountSignInProvider.password},
);

const _unverifiedUser = AccountUser(
  uid: 'user-2',
  displayName: 'New listener',
  email: 'new@example.com',
);

const _socialWithoutEmail = AccountUser(
  uid: 'user-3',
  displayName: 'Social listener',
  email: '',
  linkedProviders: {AccountSignInProvider.facebook},
);
