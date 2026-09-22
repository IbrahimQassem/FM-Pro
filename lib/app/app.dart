import "package:flutter/material.dart";
import "package:flutter_localizations/flutter_localizations.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../core/theme/app_theme.dart";
import "../features/app_update/presentation/force_update_screen.dart";
import "../features/home/presentation/home_screen.dart";
import "../features/onboarding/presentation/onboarding_screen.dart";
import "../features/splash/presentation/firebase_setup_screen.dart";
import "../features/splash/presentation/splash_screen.dart";
import "../l10n/generated/app_localizations.dart";
import "firebase_bootstrap.dart";
import "providers.dart";

class HudHudApp extends ConsumerWidget {
  const HudHudApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsControllerProvider);

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      onGenerateTitle: (context) => AppLocalizations.of(context).appName,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: settings.themeMode,
      locale: settings.locale,
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ],
      home: const _StartupGate(),
    );
  }
}

class _StartupGate extends ConsumerWidget {
  const _StartupGate();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bootstrap = ref.watch(firebaseBootstrapProvider);
    final onboardingState = ref.watch(onboardingControllerProvider);
    final updateState = ref.watch(appUpdateControllerProvider);

    return bootstrap.when(
      loading: SplashScreen.new,
      error: (error, stackTrace) => FirebaseSetupScreen(
        onRetry: () => ref.invalidate(firebaseBootstrapProvider),
      ),
      data: (result) {
        if (!result.isReady) {
          return FirebaseSetupScreen(
            onRetry: () => ref.invalidate(firebaseBootstrapProvider),
          );
        }
        if (updateState.isForceUpdate) {
          return ForceUpdateScreen(updateInfo: updateState.updateInfo);
        }
        if (onboardingState.isLoading) {
          return const SplashScreen();
        }
        return onboardingState.isCompleted
            ? const HomeScreen()
            : const OnboardingScreen();
      },
    );
  }
}
