import "package:flutter/material.dart";
import "package:flutter_localizations/flutter_localizations.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:flutter_test/flutter_test.dart";
import "package:hudhud_fm/app/providers.dart";
import "package:hudhud_fm/features/onboarding/data/repositories/onboarding_repository.dart";
import "package:hudhud_fm/features/onboarding/presentation/onboarding_screen.dart";
import "package:hudhud_fm/l10n/generated/app_localizations.dart";

class _FakeOnboardingRepository implements OnboardingRepository {
  bool isCompleted = false;

  @override
  Future<bool> hasCompletedOnboarding() async => isCompleted;

  @override
  Future<void> completeOnboarding() async {
    isCompleted = true;
  }

  @override
  Future<void> resetOnboarding() async {
    isCompleted = false;
  }
}

void main() {
  testWidgets("renders onboarding pages and completes on finish button", (
    tester,
  ) async {
    final fakeRepo = _FakeOnboardingRepository();
    bool completedCallbackCalled = false;

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          onboardingRepositoryProvider.overrideWithValue(fakeRepo),
        ],
        child: MaterialApp(
          locale: const Locale("ar"),
          supportedLocales: AppLocalizations.supportedLocales,
          localizationsDelegates: const [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: OnboardingScreen(
            onCompleted: () => completedCallbackCalled = true,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text("مرحبًا بك في هدهد FM"), findsOneWidget);
    expect(find.byKey(const Key("onboarding-skip")), findsOneWidget);
    expect(find.byKey(const Key("onboarding-next")), findsOneWidget);

    // Go to page 2
    await tester.tap(find.byKey(const Key("onboarding-next")));
    await tester.pumpAndSettle();
    expect(find.text("محطاتك المفضلة في متناول يدك"), findsOneWidget);

    // Go to page 3
    await tester.tap(find.byKey(const Key("onboarding-next")));
    await tester.pumpAndSettle();
    expect(find.text("برامج وحلقات وتفاعل مجتمعي"), findsOneWidget);
    expect(find.byKey(const Key("onboarding-start")), findsOneWidget);

    // Complete
    await tester.tap(find.byKey(const Key("onboarding-start")));
    await tester.pumpAndSettle();

    expect(fakeRepo.isCompleted, isTrue);
    expect(completedCallbackCalled, isTrue);
  });

  testWidgets("skipping onboarding immediately completes", (tester) async {
    final fakeRepo = _FakeOnboardingRepository();
    bool completedCallbackCalled = false;

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          onboardingRepositoryProvider.overrideWithValue(fakeRepo),
        ],
        child: MaterialApp(
          locale: const Locale("ar"),
          supportedLocales: AppLocalizations.supportedLocales,
          localizationsDelegates: const [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: OnboardingScreen(
            onCompleted: () => completedCallbackCalled = true,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key("onboarding-skip")));
    await tester.pumpAndSettle();

    expect(fakeRepo.isCompleted, isTrue);
    expect(completedCallbackCalled, isTrue);
  });
}
