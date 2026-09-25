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

echo "=================================================="
echo "Running Pre-Release Safety Verifications..."
MERGED_MANIFEST="build/app/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml"

if [ -f "$MERGED_MANIFEST" ]; then
  python3 -c "
import xml.etree.ElementTree as ET
import sys

manifest_path = '$MERGED_MANIFEST'
tree = ET.parse(manifest_path)
root = tree.getroot()
ns_android = '{http://schemas.android.com/apk/res/android}'

# 1. Verify Target SDK is 36 or higher
uses_sdk = root.find('uses-sdk')
if uses_sdk is not None:
    target_sdk = uses_sdk.attrib.get(ns_android + 'targetSdkVersion', '0')
    if int(target_sdk) < 36:
        print(f'❌ FATAL: targetSdkVersion ({target_sdk}) is below Google Play required 36!')
        sys.exit(1)

# 2. Verify Android 11+ queries compliance (no multiple schemes per intent)
queries = root.find('queries')
if queries is not None:
    for intent in queries.findall('intent'):
        schemes = [d.attrib.get(ns_android + 'scheme') for d in intent.findall('data') if ns_android + 'scheme' in d.attrib]
        if len(schemes) > 1:
            print(f'❌ FATAL: Malformed intent inside <queries> has multiple schemes ({schemes}). This will cause Google Play Error 6003 (INSTALL_PARSE_FAILED_MANIFEST_MALFORMED)!')
            sys.exit(1)

print('✅ Pre-Release Safety Checks Passed: Target SDK and Manifest Queries are 100% compliant.')
"
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
