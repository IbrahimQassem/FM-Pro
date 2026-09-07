"""Adapt Gemini lifecycle events to the existing read-only HudHud checks."""
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
EVENTS = {"SessionStart": "SessionStart", "AfterAgent": "Stop"}


def handle(event):
    if not isinstance(event, dict):
        return {}
    cwd = event.get("cwd")
    name = event.get("hook_event_name")
    if not isinstance(name, str) or name not in EVENTS or not isinstance(cwd, str) or not cwd:
        return {}
    try:
        location = Path(cwd)
        if not location.is_absolute():
            return {}
        location.resolve().relative_to(ROOT)
    except (ValueError, OSError):
        return {}

    # Forward only routing fields: never prompts, transcripts or responses.
    payload = {"cwd": cwd, "hook_event_name": EVENTS[name]}
    try:
        result = subprocess.run(
            [sys.executable, "-B", str(ROOT / ".codex/hooks/workspace.py")],
            input=json.dumps(payload), text=True, capture_output=True,
            cwd=ROOT, timeout=11, check=False,
        )
        if result.returncode:
            raise ValueError("Shared hook failed")
        output = json.loads(result.stdout) if result.stdout.strip() else {}
        if not isinstance(output, dict):
            raise ValueError("Invalid shared hook result")
    except (OSError, subprocess.TimeoutExpired, ValueError):
        return {"systemMessage": "HudHud advisory checks unavailable; run the relevant checks manually."}

    # Keep Gemini's output advisory even if the shared hook grows new fields.
    adapted = {}
    message = output.get("systemMessage")
    if isinstance(message, str):
        adapted["systemMessage"] = message
    context = output.get("hookSpecificOutput", {})
    if name == "SessionStart" and isinstance(context, dict):
        text = context.get("additionalContext")
        if isinstance(text, str):
            adapted["hookSpecificOutput"] = {"additionalContext": text + (
                " Gemini-specific activation is documented in "
                "docs/operations/gemini-workspace-setup.md."
            )}
    return adapted


def main():
    try:
        event = json.load(sys.stdin)
    except (ValueError, OSError):
        event = None
    print(json.dumps(handle(event)))


if __name__ == "__main__":
    main()
