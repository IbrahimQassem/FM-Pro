#!/bin/sh
set -eu

case "${CONFIGURATION:-}" in
  Release*) ;;
  *) exit 0 ;;
esac

release_root=HudHudOfficial
release_apple_id=
saved_ifs=$IFS
IFS=,
for encoded_define in ${DART_DEFINES:-}; do
  decoded_define=$(printf '%s' "$encoded_define" | /usr/bin/base64 -D) || exit 1
  case "$decoded_define" in
    FIRESTORE_ROOT=*)
      release_root=${decoded_define#FIRESTORE_ROOT=}
      if [ "$release_root" != HudHudOfficial ]; then
        echo 'error: iOS release requires the Official Firestore root.' >&2
        exit 1
      fi ;;
    IOS_APP_ID=*) release_apple_id=${decoded_define#IOS_APP_ID=} ;;
  esac
done
IFS=$saved_ifs
case "$release_apple_id" in
  ''|0*|*[!0-9]*)
    echo 'error: iOS release requires a numeric IOS_APP_ID Dart define.' >&2
    exit 1 ;;
esac
echo 'iOS release configuration validated.'
