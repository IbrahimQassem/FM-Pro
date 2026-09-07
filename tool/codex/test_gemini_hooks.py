"""Verify Gemini event adaptation without network access or mutations."""
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location(
    "gemini_hook", ROOT / ".gemini/hooks/workspace.py")
hook = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hook)


class GeminiHookTest(unittest.TestCase):
    def event(self, name="AfterAgent"):
        return {"cwd": str(ROOT / "web_admin"), "hook_event_name": name,
                "prompt": "private sentinel", "transcript_path": "/private/sentinel"}

    def test_after_agent_maps_to_stop_without_forwarding_private_fields(self):
        with patch.object(hook.subprocess, "run", return_value=
                          subprocess.CompletedProcess([], 0, "", "")) as run:
            self.assertEqual(hook.handle(self.event()), {})
            payload = json.loads(run.call_args.kwargs["input"])
            self.assertEqual(payload, {"cwd": str(ROOT / "web_admin"),
                                       "hook_event_name": "Stop"})

    def test_context_uses_gemini_output_shape(self):
        response = {"hookSpecificOutput": {"hookEventName": "SessionStart",
                                            "additionalContext": "Shared guidance"}}
        with patch.object(hook.subprocess, "run", return_value=
                          subprocess.CompletedProcess([], 0, json.dumps(response), "")):
            output = hook.handle(self.event("SessionStart"))
            context = output["hookSpecificOutput"]
            self.assertNotIn("hookEventName", context)
            self.assertIn("Shared guidance", context["additionalContext"])

    def test_hook_cannot_trigger_retries_or_block(self):
        response = {"decision": "deny", "continue": False, "reason": "retry",
                    "systemMessage": "advisory"}
        with patch.object(hook.subprocess, "run", return_value=
                          subprocess.CompletedProcess([], 0, json.dumps(response), "")):
            self.assertEqual(hook.handle(self.event()), {"systemMessage": "advisory"})

    def test_outside_missing_or_relative_cwd_is_ignored(self):
        with patch.object(hook.subprocess, "run") as run:
            for cwd in [str(ROOT.parent), "", "web_admin", None]:
                event = self.event()
                event["cwd"] = cwd
                self.assertEqual(hook.handle(event), {})
            run.assert_not_called()

    def test_timeout_is_nonblocking_and_does_not_leak_error(self):
        with patch.object(hook.subprocess, "run", side_effect=
                          subprocess.TimeoutExpired("private sentinel", 11)):
            output = hook.handle(self.event())
            self.assertIn("systemMessage", output)
            self.assertNotIn("private sentinel", json.dumps(output))

    def test_malformed_input_returns_json(self):
        with patch.object(hook.sys, "stdin", io.StringIO("not json")), \
             patch("sys.stdout", new_callable=io.StringIO) as output:
            hook.main()
            self.assertEqual(json.loads(output.getvalue()), {})


if __name__ == "__main__":
    unittest.main()
