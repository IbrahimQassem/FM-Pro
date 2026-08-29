import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/theme/app_theme.dart';
import '../features/home/presentation/home_screen.dart';
import '../features/splash/presentation/firebase_setup_screen.dart';
import '../features/splash/presentation/splash_screen.dart';
import '../l10n/generated/app_localizations.dart';
import 'firebase_bootstrap.dart';

class HudHudApp extends StatelessWidget {
  const HudHudApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      onGenerateTitle: (context) => AppLocalizations.of(context).appName,
      theme: AppTheme.light(),
      locale: const Locale('ar'),
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
    return bootstrap.when(
      loading: SplashScreen.new,
      error: (error, stackTrace) => FirebaseSetupScreen(
        onRetry: () => ref.invalidate(firebaseBootstrapProvider),
      ),
      data: (result) => result.isReady
          ? const HomeScreen()
          : FirebaseSetupScreen(
              onRetry: () => ref.invalidate(firebaseBootstrapProvider),
            ),
    );
  }
}
