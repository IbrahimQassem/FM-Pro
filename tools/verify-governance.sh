#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
cd "$PROJECT_ROOT"

required_files="
AGENTS.md
docs/README.md
docs/contracts/architecture-contract.md
docs/contracts/product-ux-contract.md
docs/contracts/firebase-data-contract.md
docs/contracts/security-privacy-contract.md
docs/contracts/quality-release-contract.md
docs/roadmap/phased-delivery-plan.md
docs/roadmap/technical-debt-register.md
docs/roadmap/definition-of-done.md
"

for required_file in $required_files; do
  if [ ! -s "$required_file" ]; then
    echo "ERROR: missing or empty required file: $required_file" >&2
    exit 1
  fi
done

for skill_dir in .agents/skills/*; do
  if [ ! -s "$skill_dir/SKILL.md" ] || [ ! -s "$skill_dir/agents/openai.yaml" ]; then
    echo "ERROR: incomplete skill package: $skill_dir" >&2
    exit 1
  fi
done

for role_file in .agents/roles/*.md; do
  if [ ! -s "$role_file" ]; then
    echo "ERROR: empty agent role: $role_file" >&2
    exit 1
  fi
done

comment_only_found=0
for java_file in $(find app/src/main/java -type f -name '*.java' -print); do
  if ! awk '
    NF && $0 !~ /^[[:space:]]*\/\// { found = 1; exit }
    END { exit found ? 0 : 1 }
  ' "$java_file"; then
    echo "ERROR: Java file contains only blank or line-commented code: $java_file" >&2
    comment_only_found=1
  fi
done

if [ "$comment_only_found" -ne 0 ]; then
  exit 1
fi

git diff --check
echo "Governance verification passed."
