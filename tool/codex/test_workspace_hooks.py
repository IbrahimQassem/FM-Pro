"""Behavior checks for repository-scoped, advisory Codex hooks."""
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location(
    "workspace_hook", ROOT / ".codex/hooks/workspace.py")
hook = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hook)


class WorkspaceHookTest(unittest.TestCase):
    def invoke(self, event, result=0):
        with patch.object(hook.sys, "stdin", io.StringIO(json.dumps(event))), \
             patch("sys.stdout", new_callable=io.StringIO) as output, \
             patch.object(hook.subprocess, "run", return_value=
                          subprocess.CompletedProcess([], result)) as run:
            hook.main()
            return output.getvalue(), run

    def test_subdirectory_receives_start_context_without_running_commands(self):
        output, run = self.invoke({"hook_event_name": "SessionStart",
                                   "cwd": str(ROOT / "web_admin")})
        self.assertEqual(json.loads(output)["hookSpecificOutput"]["hookEventName"],
                         "SessionStart")
        run.assert_not_called()

    def test_other_repository_is_ignored(self):
        output, run = self.invoke({"hook_event_name": "Stop", "cwd": str(ROOT.parent)})
        self.assertEqual(output, "")
        run.assert_not_called()

    def test_passing_stop_is_silent_and_checks_both_diffs(self):
        output, run = self.invoke({"hook_event_name": "Stop", "cwd": str(ROOT)})
        self.assertEqual(output, "")
        self.assertEqual(run.call_count, 3)
        for call in run.call_args_list:
            self.assertEqual(call.kwargs["cwd"], ROOT)
            self.assertEqual(call.kwargs["stdout"], subprocess.DEVNULL)

    def test_failed_checks_are_advisory_without_payload_leak(self):
        output, _ = self.invoke({"hook_event_name": "Stop", "cwd": str(ROOT),
                                 "last_assistant_message": "private sentinel"}, result=1)
        parsed = json.loads(output)
        self.assertIn("systemMessage", parsed)
        self.assertNotIn("decision", parsed)
        self.assertNotIn("continue", parsed)
        self.assertNotIn("private sentinel", output)

    def test_malformed_input_is_ignored(self):
        with patch.object(hook.sys, "stdin", io.StringIO("not json")), \
             patch("sys.stdout", new_callable=io.StringIO) as output:
            hook.main()
            self.assertEqual(output.getvalue(), "")


if __name__ == "__main__":
    unittest.main()
