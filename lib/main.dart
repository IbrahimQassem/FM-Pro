import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:just_audio_background/just_audio_background.dart';

import 'app/app.dart';
import 'app/firebase_bootstrap.dart';
import 'core/config/app_config.dart';
import 'core/config/firestore_paths.dart';
import 'l10n/generated/app_localizations_ar.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      systemNavigationBarColor: Colors.transparent,
      systemNavigationBarDividerColor: Colors.transparent,
    ),
  );
  FirestorePaths.validate();
  AppConfig.validate(
    requireIosStoreId:
        kReleaseMode && !kIsWeb && defaultTargetPlatform == TargetPlatform.iOS,
  );
  await initializeFirebase();
  final strings = AppLocalizationsAr();
  await JustAudioBackground.init(
    androidNotificationChannelId: 'com.sana.dev.fm.audio.playback',
    androidNotificationChannelName:
        strings.audioPlaybackNotificationChannelName,
    androidNotificationChannelDescription:
        strings.audioPlaybackNotificationChannelDescription,
    androidNotificationOngoing: true,
    androidNotificationIcon: 'drawable/ic_notification',
  );
  runApp(const ProviderScope(child: HudHudApp()));
}
