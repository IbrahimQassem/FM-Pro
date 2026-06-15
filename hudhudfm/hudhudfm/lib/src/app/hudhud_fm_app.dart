import 'package:flutter/material.dart';

import '../features/bootstrap/presentation/splash_screen.dart';
import '../features/home/presentation/home_screen.dart';
import '../features/player/application/player_controller.dart';
import '../features/version/presentation/force_update_screen.dart';
import 'app_bootstrap.dart';
import 'app_theme.dart';

class HudhudFmApp extends StatefulWidget {
  const HudhudFmApp({super.key, this.bootstrap, this.playerController});

  final AppBootstrap? bootstrap;
  final PlayerController? playerController;

  @override
  State<HudhudFmApp> createState() => _HudhudFmAppState();
}

class _HudhudFmAppState extends State<HudhudFmApp> {
  late Future<AppBootstrapData> _bootstrapFuture;
  late final PlayerController _playerController;

  @override
  void initState() {
    super.initState();
    _bootstrapFuture = (widget.bootstrap ?? AppBootstrap()).load();
    _playerController = widget.playerController ?? PlayerController();
  }

  @override
  void dispose() {
    _playerController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'هدهد FM',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      locale: const Locale('ar'),
      builder: (context, child) {
        return Directionality(
          textDirection: TextDirection.rtl,
          child: child ?? const SizedBox.shrink(),
        );
      },
      home: FutureBuilder<AppBootstrapData>(
        future: _bootstrapFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const SplashScreen();
          }

          if (snapshot.hasError || !snapshot.hasData) {
            return SplashScreen(
              message: 'تعذر تحميل بيانات التطبيق',
              actionLabel: 'إعادة المحاولة',
              onActionPressed: () {
                setState(() {
                  _bootstrapFuture = (widget.bootstrap ?? AppBootstrap())
                      .load();
                });
              },
            );
          }

          if (snapshot.requireData.isForceUpdateRequired) {
            return ForceUpdateScreen(
              requiredVersion:
                  snapshot.requireData.remoteConfig.requiredVersion,
              currentVersion: snapshot.requireData.currentVersion.buildNumber,
            );
          }

          return HomeScreen(
            bootstrapData: snapshot.requireData,
            playerController: _playerController,
          );
        },
      ),
    );
  }
}
