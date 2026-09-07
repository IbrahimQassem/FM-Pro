"""Read-only, advisory lifecycle checks; never log hook input or file contents."""
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]


def main():
    try:
        event = json.load(sys.stdin)
    except (ValueError, OSError):
        return
    if not isinstance(event, dict):
        return
    try:
        Path(event.get("cwd", "")).resolve().relative_to(ROOT)
    except (ValueError, TypeError):
        return
    name = event.get("hook_event_name")
    if name == "SessionStart":
        print(json.dumps({"hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": (
                "HudHud workspace: read AGENTS.md, docs/README.md and the target's nested "
                "AGENTS.md. Local skills cover Flutter, web and Firebase. See "
                "docs/operations/codex-workspace-setup.md for tools and verification. "
                "Existing contracts own behavior; use relevant checks for changed components. "
                "Preserve current user authorization and unrelated changes."
            ),
        }}))
    elif name == "Stop":
        failed = []
        checks = [
            ("governance", ["sh", "tool/verify-governance.sh"]),
            ("working diff", ["git", "diff", "--check"]),
            ("staged diff", ["git", "diff", "--cached", "--check"]),
        ]
        for label, command in checks:
            try:
                result = subprocess.run(command, cwd=ROOT, stdout=subprocess.DEVNULL,
                                        stderr=subprocess.DEVNULL, timeout=3, check=False)
                if result.returncode:
                    failed.append(label)
            except (OSError, subprocess.TimeoutExpired):
                failed.append(label)
        if failed:
            print(json.dumps({"systemMessage": "HudHud advisory check needs attention: "
                              + ", ".join(failed) + ". Run the check directly; this hook is not a test gate."}))


if __name__ == "__main__":
    main()
