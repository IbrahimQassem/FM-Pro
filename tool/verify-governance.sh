#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
cd "$PROJECT_ROOT"

required_files="
AGENTS.md
docs/README.md
docs/contracts/architecture-contract.md
docs/contracts/firebase-data-contract.md
docs/contracts/security-privacy-contract.md
docs/contracts/product-ux-contract.md
docs/contracts/playback-contract.md
docs/contracts/quality-release-contract.md
docs/reference/legacy-app-capability-inventory.md
.agents/README.md
.agents/roles/delivery-lead.md
.agents/roles/flutter-architecture.md
.agents/roles/firebase-data-security.md
.agents/roles/product-ux-accessibility.md
.agents/roles/playback.md
.agents/roles/quality-release.md
"

for required_file in $required_files; do
  if [ ! -s "$required_file" ]; then
    echo "ERROR: missing or empty governance file: $required_file" >&2
    exit 1
  fi
done

for ignored_file in \
  /android/app/google-services.json \
  /ios/Runner/GoogleService-Info.plist \
  /lib/firebase_options.dart; do
  if ! grep -Fxq "$ignored_file" .gitignore; then
    echo "ERROR: Firebase environment file is not ignored: $ignored_file" >&2
    exit 1
  fi
done

if rg -n '\.\./FM-Pro' .agents docs README.md >/dev/null 2>&1; then
  echo "ERROR: Flutter governance must not depend on FM-Pro content." >&2
  exit 1
fi

echo "Flutter governance verification passed."
