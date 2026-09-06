import 'package:flutter/widgets.dart';
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
  FirestorePaths.validate();
  AppConfig.validate(
    requireIosStoreId:
        kReleaseMode && !kIsWeb && defaultTargetPlatform == TargetPlatform.iOS,
  );
  await initializeFirebase();
  final strings = AppLocalizationsAr();
  await JustAudioBackground.init(
    androidNotificationChannelId: 'com.sanaadev.hudhudfm.audio.playback',
    androidNotificationChannelName:
        strings.audioPlaybackNotificationChannelName,
    androidNotificationChannelDescription:
        strings.audioPlaybackNotificationChannelDescription,
    androidNotificationOngoing: true,
  );
  runApp(const ProviderScope(child: HudHudApp()));
}
