import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Android declares the media playback foreground service contract', () {
    final manifest = File(
      'android/app/src/main/AndroidManifest.xml',
    ).readAsStringSync();
    final activity = File(
      'android/app/src/main/kotlin/com/sanaadev/hudhudfm/MainActivity.kt',
    ).readAsStringSync();

    expect(manifest, contains('android.permission.INTERNET'));
    expect(manifest, contains('android.permission.WAKE_LOCK'));
    expect(manifest, contains('android.permission.FOREGROUND_SERVICE'));
    expect(
      manifest,
      contains('android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK'),
    );
    expect(manifest, contains('com.ryanheise.audioservice.AudioService'));
    expect(
      manifest,
      contains('com.ryanheise.audioservice.MediaButtonReceiver'),
    );
    expect(manifest, contains('android:foregroundServiceType="mediaPlayback"'));
    expect(activity, contains('class MainActivity : AudioServiceActivity()'));
  });

  test('iOS declares audio background mode', () {
    final infoPlist = File('ios/Runner/Info.plist').readAsStringSync();

    expect(infoPlist, contains('<key>UIBackgroundModes</key>'));
    expect(infoPlist, contains('<string>audio</string>'));
  });

  test('application initializes the background audio handler', () {
    final mainSource = File('lib/main.dart').readAsStringSync();

    expect(mainSource, contains('await JustAudioBackground.init('));
    expect(mainSource, contains('androidNotificationOngoing: true'));
  });
}
