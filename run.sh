#!/usr/bin/env bash
# ==============================================================================
# HudHud FM (هدهد إف إم) — Quick Launch Runner
# Usage:
#   ./run.sh                  -> Auto-detects booted device / runs iOS simulator
#   ./run.sh ios              -> Boots iOS simulator if needed & runs on iPhone
#   ./run.sh iphone [release] -> Runs on physical iPhone (default: release, or debug)
#   ./run.sh android          -> Runs on connected Android device / emulator
#   ./run.sh web              -> Runs Web player (web_hudhud / Chrome)
#   ./run.sh admin            -> Runs Admin dashboard (web_admin)
#   ./run.sh test             -> Runs flutter analyze & unit/widget test suite
#   ./run.sh clean            -> Cleans build cache, fetches packages & installs pods
#   ./run.sh bundle           -> Builds Android App Bundle (AAB) with safety checks
# ==============================================================================

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -d "$PROJECT_DIR/hudhud_fm" ] && [ -f "$PROJECT_DIR/hudhud_fm/pubspec.yaml" ]; then
  PROJECT_DIR="$PROJECT_DIR/hudhud_fm"
fi
cd "$PROJECT_DIR"

TARGET="${1:-ios}"

case "$TARGET" in
  ios)
    MODE="${2:-debug}"
    echo "🚀 Starting HudHud FM on iOS Simulator (mode: $MODE)..."
    
    # Check if Simulator app is open
    open -a Simulator 2>/dev/null || true
    
    # Find booted simulator or default to iPhone
    BOOTED_DEVICE=$(xcrun simctl list devices | grep -E "Booted" | head -n 1 | sed -E 's/.*\(([A-F0-9-]+)\).*/\1/')
    
    if [ -z "$BOOTED_DEVICE" ]; then
      echo "📱 No booted simulator found. Booting iPhone 17 Pro Max..."
      SIM_ID=$(xcrun simctl list devices | grep "iPhone 17 Pro Max" | head -n 1 | sed -E 's/.*\(([A-F0-9-]+)\).*/\1/')
      if [ -n "$SIM_ID" ]; then
        xcrun simctl boot "$SIM_ID" 2>/dev/null || true
        BOOTED_DEVICE="$SIM_ID"
      else
        # Boot first available iPhone
        FIRST_IPHONE=$(xcrun simctl list devices | grep "iPhone" | head -n 1 | sed -E 's/.*\(([A-F0-9-]+)\).*/\1/')
        xcrun simctl boot "$FIRST_IPHONE" 2>/dev/null || true
        BOOTED_DEVICE="$FIRST_IPHONE"
      fi
      xcrun simctl bootstatus "$BOOTED_DEVICE" -b 2>/dev/null || true
    fi

    echo "🎯 Targeting iOS Device: $BOOTED_DEVICE"
    if [ "$MODE" = "release" ]; then
      flutter run -d "$BOOTED_DEVICE" --release \
        --dart-define=FIRESTORE_ROOT=HudHudOfficial \
        --dart-define=IOS_APP_ID="${IOS_APP_ID:-1234567890}" \
        "${@:3}"
    else
      flutter run -d "$BOOTED_DEVICE" "${@:2}"
    fi
    ;;

  iphone|device)
    MODE="${2:-release}"
    MODE="${MODE#\[}"
    MODE="${MODE%\]}"
    echo "📱 Running HudHud FM on physical iPhone (mode: $MODE)..."
    DEVICE_ID=$(flutter devices 2>/dev/null | grep -E "• [0-9A-Fa-f-]+ •" | grep -vi "simulator" | head -n 1 | sed -E 's/.*• ([0-9A-Fa-f-]+) •.*/\1/')
    if [ -z "$DEVICE_ID" ]; then
      DEVICE_ID="00008110-001C55AC1106801E"
    fi
    echo "🎯 Targeting physical device: $DEVICE_ID"
    if [ "$MODE" = "release" ]; then
      flutter run -d "$DEVICE_ID" --release \
        --dart-define=FIRESTORE_ROOT=HudHudOfficial \
        --dart-define=IOS_APP_ID="${IOS_APP_ID:-1234567890}" \
        "${@:3}"
    else
      flutter run -d "$DEVICE_ID" "${@:3}"
    fi
    ;;

  android)
    MODE="${2:-debug}"
    echo "🤖 Starting HudHud FM on Android (mode: $MODE)..."
    if [ "$MODE" = "release" ]; then
      flutter run -d android --release \
        --dart-define=FIRESTORE_ROOT=HudHudOfficial \
        "${@:3}"
    else
      flutter run -d android "${@:2}"
    fi
    ;;

  web)
    echo "🌐 Starting HudHud FM Web..."
    if [ -d "web" ]; then
      flutter run -d chrome "${@:2}"
    else
      echo "ℹ️  Launching public web player (web_hudhud)..."
      cd web_hudhud && VITE_FIRESTORE_ROOT="${FIRESTORE_ROOT:-HudHudDev}" npm run dev
    fi
    ;;

  admin|web-admin)
    echo "🌐 Starting HudHud FM Admin Panel (web_admin)..."
    cd web_admin && VITE_FIRESTORE_ROOT="${FIRESTORE_ROOT:-HudHudDev}" npm run dev
    ;;

  test)
    echo "🧪 Running Static Analysis & Test Suite..."
    flutter analyze lib test
    flutter test "${@:2}"
    ;;

  clean)
    echo "🧹 Deep cleaning project..."
    flutter clean
    flutter pub get
    if [ -d "ios" ]; then
      echo "📦 Installing CocoaPods dependencies..."
      cd ios
      pod install
      cd ..
    fi
    echo "✨ Clean complete!"
    ;;

  bundle|appbundle)
    echo "📦 Building Android App Bundle via tool/build-release-bundle.sh..."
    bash tool/build-release-bundle.sh "${@:2}"
    ;;

  *)
    echo "❌ Unknown target: $TARGET"
    echo "Usage: ./run.sh [ios|iphone [release|debug]|android|web|admin|test|clean|bundle]"
    exit 1
    ;;
esac
