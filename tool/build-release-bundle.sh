#!/bin/bash
set -euo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
cd "$PROJECT_ROOT"

# Extract version and build number from pubspec.yaml
VERSION_LINE=$(grep '^version:' pubspec.yaml | head -n 1 | awk '{print $2}')
VERSION_NAME=$(echo "$VERSION_LINE" | cut -d'+' -f1)
VERSION_CODE=$(echo "$VERSION_LINE" | cut -d'+' -f2)

if [ -z "$VERSION_NAME" ] || [ -z "$VERSION_CODE" ]; then
  echo "Error: Unable to parse version from pubspec.yaml (found: '$VERSION_LINE')" >&2
  exit 1
fi

echo "=================================================="
echo "Building HudHud FM Android App Bundle (AAB)"
echo "Target: FIRESTORE_ROOT=HudHudOfficial"
echo "Version Name: $VERSION_NAME"
echo "Version Code: $VERSION_CODE"
echo "=================================================="

flutter build appbundle --release \
  --dart-define=FIRESTORE_ROOT=HudHudOfficial \
  --dart-define=APP_VERSION_NAME="$VERSION_NAME" \
  --dart-define=APP_VERSION_CODE="$VERSION_CODE" \
  "$@"

SOURCE_AAB="build/app/outputs/bundle/release/app-release.aab"

if [ ! -f "$SOURCE_AAB" ]; then
  echo "Error: $SOURCE_AAB was not generated!" >&2
  exit 1
fi

DEST_AAB_NAME="hudhud-fm-v${VERSION_NAME}-b${VERSION_CODE}-release.aab"
DEST_AAB_PATH="build/app/outputs/bundle/release/${DEST_AAB_NAME}"

cp -f "$SOURCE_AAB" "$DEST_AAB_PATH"

echo "=================================================="
echo "✅ Build & Package completed successfully!"
echo "Standard Output: $SOURCE_AAB"
echo "Versioned Artifact: $DEST_AAB_PATH"
echo "File Size: $(ls -lh "$DEST_AAB_PATH" | awk '{print $5}')"
echo "=================================================="
