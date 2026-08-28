#!/usr/bin/env bash
set -euo pipefail

JAVA_17_HOME="${JAVA_HOME:-$(/usr/libexec/java_home -v 17 2>/dev/null || echo '/Users/iq/Library/Java/JavaVirtualMachines/jbr-17.0.14/Contents/Home')}"
if [ ! -d "$JAVA_17_HOME" ] && [ -d "/Users/iq/Library/Java/JavaVirtualMachines/jbr-17.0.14/Contents/Home" ]; then
  JAVA_17_HOME="/Users/iq/Library/Java/JavaVirtualMachines/jbr-17.0.14/Contents/Home"
fi
FLAVOR="${1:-hudhudOfficial}"

if [ "$FLAVOR" = "hudhudDev" ] || [ "$FLAVOR" = "hudhud_fm" ] || [ "$FLAVOR" = "dev" ]; then
  TASK_NAME="assembleHudhudDevDebug"
  APK_PATH="app/build/outputs/apk/hudhudDev/debug/hudhud-v(2.1.0)-hudhudDev-debug.apk"
  PACKAGE_NAME="com.sanaadev.hudhudfm"
elif [ "$FLAVOR" = "internews" ]; then
  TASK_NAME="assembleInternewsDebug"
  APK_PATH="app/build/outputs/apk/internews/debug/hudhud-v(2.1.0)-internews-debug.apk"
  PACKAGE_NAME="com.sanaadev.internews"
else
  TASK_NAME="assembleHudhudOfficialDebug"
  APK_PATH="app/build/outputs/apk/hudhudOfficial/debug/hudhud-official-v(2.1.0)-hudhudOfficial-debug.apk"
  PACKAGE_NAME="com.sana.dev.fm"
fi

echo "==> Building $FLAVOR via Gradle ($TASK_NAME)..."
./gradlew -Dorg.gradle.java.home="$JAVA_17_HOME" ":app:$TASK_NAME" --no-daemon

echo "==> Installing APK via ADB..."
adb install -r "$APK_PATH"

echo "==> Launching $PACKAGE_NAME on connected device/emulator..."
adb shell am start -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -n "$PACKAGE_NAME/com.sana.dev.fm.ui.activity.SplashActivity"

echo "==> Application launched successfully."
