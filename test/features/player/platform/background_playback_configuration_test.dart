import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Android declares the media playback foreground service contract', () {
    final manifest = File(
      'android/app/src/main/AndroidManifest.xml',
    ).readAsStringSync();
    final activity = File(
      'android/app/src/main/kotlin/com/sana/dev/fm/MainActivity.kt',
    ).readAsStringSync();

    expect(manifest, contains('android.permission.INTERNET'));
    expect(manifest, contains('android.permission.ACCESS_NETWORK_STATE'));
    expect(manifest, contains('android.permission.WAKE_LOCK'));
    expect(manifest, contains('android.permission.FOREGROUND_SERVICE'));
    expect(
      manifest,
      contains('android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK'),
    );
    expect(manifest, contains('android:usesCleartextTraffic="true"'));
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
    expect(
      mainSource,
      contains("androidNotificationIcon: 'drawable/ic_notification'"),
    );
  });

  test('Android retains monochrome notification icon for AudioService', () {
    final iconFile =
        File('android/app/src/main/res/drawable/ic_notification.xml');
    expect(iconFile.existsSync(), isTrue);
    final iconXml = iconFile.readAsStringSync();
    expect(iconXml, contains('<vector'));

    final keepFile = File('android/app/src/main/res/raw/keep.xml');
    expect(keepFile.existsSync(), isTrue);
    final keepXml = keepFile.readAsStringSync();
    expect(keepXml, contains('@drawable/ic_notification'));
  });
}
