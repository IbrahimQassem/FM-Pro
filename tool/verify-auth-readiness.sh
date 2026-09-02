#!/usr/bin/env bash

set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
android_config="$root_dir/android/app/google-services.json"
ios_firebase_config="$root_dir/ios/Runner/GoogleService-Info.plist"
ios_provider_config="$root_dir/ios/Flutter/AuthProviders.xcconfig"
android_provider_config="$root_dir/android/auth-providers.properties"

fail() {
  echo "Auth readiness failed: $1" >&2
  exit 1
}

require_file() {
  [[ -s "$1" ]] || fail "$1 is missing or empty"
}

require_setting() {
  local file="$1"
  local key="$2"
  ruby -e '
    file, key = ARGV
    value = File.read(file)[/^#{Regexp.escape(key)}\s*=\s*(.+)$/, 1].to_s.strip
    exit(value.empty? || value == "0" || value.start_with?("REPLACE") ? 1 : 0)
  ' "$file" "$key" || fail "$key is not configured in $file"
}

require_file "$android_config"
require_file "$ios_firebase_config"
require_file "$ios_provider_config"
require_file "$android_provider_config"

for key in \
  HUDHUD_GOOGLE_IOS_CLIENT_ID \
  HUDHUD_GOOGLE_REVERSED_CLIENT_ID \
  HUDHUD_FACEBOOK_APP_ID \
  HUDHUD_FACEBOOK_CLIENT_TOKEN; do
  require_setting "$ios_provider_config" "$key"
done

for key in HUDHUD_FACEBOOK_APP_ID HUDHUD_FACEBOOK_CLIENT_TOKEN; do
  require_setting "$android_provider_config" "$key"
done

git -C "$root_dir" check-ignore -q android/app/google-services.json \
  || fail "android/app/google-services.json must remain ignored"
git -C "$root_dir" check-ignore -q android/auth-providers.properties \
  || fail "android/auth-providers.properties must remain ignored"
git -C "$root_dir" check-ignore -q ios/Runner/GoogleService-Info.plist \
  || fail "ios/Runner/GoogleService-Info.plist must remain ignored"
git -C "$root_dir" check-ignore -q ios/Flutter/AuthProviders.xcconfig \
  || fail "ios/Flutter/AuthProviders.xcconfig must remain ignored"

ruby -r json -e '
  config = JSON.parse(File.read(ARGV.fetch(0)))
  clients = config.fetch("client", []).select do |client|
    client.dig("client_info", "android_client_info", "package_name") == "com.sanaadev.hudhudfm"
  end
  oauth = clients.flat_map { |client| client.fetch("oauth_client", []) }
  exit(clients.one? && oauth.any? { |client| client["client_type"] == 3 } ? 0 : 1)
' "$android_config" || fail "Android Firebase config has no matching OAuth client"

echo "Local auth provider readiness passed."
