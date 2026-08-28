#!/usr/bin/env bash
set -euo pipefail

JAVA_17_HOME="${JAVA_HOME:-$(/usr/libexec/java_home -v 17 2>/dev/null || echo '/Users/iq/Library/Java/JavaVirtualMachines/jbr-17.0.14/Contents/Home')}"
if [ ! -d "$JAVA_17_HOME" ] && [ -d "/Users/iq/Library/Java/JavaVirtualMachines/jbr-17.0.14/Contents/Home" ]; then
  JAVA_17_HOME="/Users/iq/Library/Java/JavaVirtualMachines/jbr-17.0.14/Contents/Home"
fi
FLAVOR="${1:-hudhudfm_google_play}"

if [ "$FLAVOR" = "hudhud_fm" ]; then
  TASK_NAME="installHudhud_fmDebug"
  PACKAGE_NAME="com.sanaadev.hudhudfm"
else
  TASK_NAME="installHudhudfm_google_playDebug"
  PACKAGE_NAME="com.sana.dev.fm"
fi

echo "==> Building and installing $FLAVOR via Gradle ($TASK_NAME)..."
./gradlew -Dorg.gradle.java.home="$JAVA_17_HOME" ":app:$TASK_NAME" --no-daemon

echo "==> Launching $PACKAGE_NAME on connected device/emulator..."
adb shell am start -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -n "$PACKAGE_NAME/com.sana.dev.fm.ui.activity.SplashActivity"

echo "==> Application launched successfully."
