#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
cd "$PROJECT_ROOT"

java_count=$(find app/src/main/java -type f -name '*.java' -print | wc -l | tr -d ' ')
layout_count=$(find app/src/main/res/layout -type f -name '*.xml' -print | wc -l | tr -d ' ')
android_test_count=$(find app/src -type f \( -path '*/test/*' -o -path '*/androidTest/*' \) | wc -l | tr -d ' ')
firebase_rules_test_count=$(find tests/firebase-rules -type f -name '*.test.js' | wc -l | tr -d ' ')
todo_count=$(rg -n 'TODO|FIXME' app/src/main/java app/src/main/res 2>/dev/null | wc -l | tr -d ' ')
firebase_ui_count=$(rg -l 'FirebaseFirestore|FirebaseAuth|FirebaseStorage' \
  app/src/main/java/com/sana/dev/fm/ui app/src/main/java/com/sana/dev/fm/adapter \
  2>/dev/null | wc -l | tr -d ' ')

echo "FM-Pro technical-debt snapshot"
echo "Java files: $java_count"
echo "Layout files: $layout_count"
echo "Android test files: $android_test_count"
echo "Firebase Rules test files: $firebase_rules_test_count"
echo "TODO/FIXME markers: $todo_count"
echo "UI/adapter files importing Firebase SDK: $firebase_ui_count"

if git ls-files --error-unmatch key.properties >/dev/null 2>&1; then
  echo "SECURITY DEBT: key.properties is still tracked (TD-002)."
fi

if rg -q 'android:usesCleartextTraffic="true"' app/src/main/AndroidManifest.xml; then
  echo "SECURITY DEBT: cleartext traffic is enabled (TD-008)."
fi

echo "Authoritative status: docs/roadmap/technical-debt-register.md"
