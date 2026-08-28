#!/usr/bin/env bash
set -euo pipefail

JAVA_17_HOME="${JAVA_HOME:-$(/usr/libexec/java_home -v 17 2>/dev/null || echo '/Users/iq/Library/Java/JavaVirtualMachines/jbr-17.0.14/Contents/Home')}"
if [ ! -d "$JAVA_17_HOME" ] && [ -d "/Users/iq/Library/Java/JavaVirtualMachines/jbr-17.0.14/Contents/Home" ]; then
  JAVA_17_HOME="/Users/iq/Library/Java/JavaVirtualMachines/jbr-17.0.14/Contents/Home"
fi
FLAVOR="${1:-hudhudOfficial}"

if [ "$FLAVOR" = "hudhudDev" ] || [ "$FLAVOR" = "hudhud_fm" ] || [ "$FLAVOR" = "dev" ]; then
  TASK_NAME="assembleHudhudDevDebug"
  FLAVOR_DIR="hudhudDev"
  PACKAGE_NAME="com.sanaadev.hudhudfm"
elif [ "$FLAVOR" = "internews" ]; then
  TASK_NAME="assembleInternewsDebug"
  FLAVOR_DIR="internews"
  PACKAGE_NAME="com.sanaadev.internews"
else
  TASK_NAME="assembleHudhudOfficialDebug"
  FLAVOR_DIR="hudhudOfficial"
  PACKAGE_NAME="com.sana.dev.fm"
fi

echo "==> Building $FLAVOR via Gradle ($TASK_NAME)..."
./gradlew -Dorg.gradle.java.home="$JAVA_17_HOME" ":app:$TASK_NAME" --no-daemon

APK_PATH=$(ls app/build/outputs/apk/"$FLAVOR_DIR"/debug/*.apk 2>/dev/null | head -n 1)
if [ -z "$APK_PATH" ] || [ ! -f "$APK_PATH" ]; then
  echo "Error: Could not find generated APK in app/build/outputs/apk/$FLAVOR_DIR/debug/"
  exit 1
fi

echo "==> Installing $APK_PATH via ADB..."
adb install -r "$APK_PATH"

echo "==> Launching $PACKAGE_NAME on connected device/emulator..."
adb shell am start -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -n "$PACKAGE_NAME/com.sana.dev.fm.ui.activity.SplashActivity"

echo "==> Application launched successfully."
