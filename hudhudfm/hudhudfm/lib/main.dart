import 'package:flutter/material.dart';
import 'package:just_audio_background/just_audio_background.dart';

import 'src/app/app_dependencies.dart';
import 'src/app/hudhud_fm_app.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await JustAudioBackground.init(
    androidNotificationChannelId: 'com.sanaadev.hudhudfm.audio',
    androidNotificationChannelName: 'Hudhud FM playback',
    androidNotificationOngoing: true,
  );

  final dependencies = await AppDependencies.create();
  runApp(
    HudhudFmApp(
      bootstrap: dependencies.bootstrap,
      playerController: dependencies.playerController,
    ),
  );
}
