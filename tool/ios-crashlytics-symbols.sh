#!/bin/sh
set -eu

# Debug and simulator builds never upload symbols.
case "${CONFIGURATION:-}:${PLATFORM_NAME:-}" in
  Release*:iphoneos) ;;
  *) exit 0 ;;
esac

if [ -f "${PODS_ROOT:-}/FirebaseCrashlytics/run" ]; then
  exec /bin/sh "${PODS_ROOT}/FirebaseCrashlytics/run"
fi
crashlytics_run="${BUILD_DIR%/Build/*}/SourcePackages/checkouts/firebase-ios-sdk/Crashlytics/run"
if [ ! -f "$crashlytics_run" ]; then
  echo 'error: Crashlytics symbol tool is missing from the release build.' >&2
  exit 1
fi
exec /bin/sh "$crashlytics_run"
