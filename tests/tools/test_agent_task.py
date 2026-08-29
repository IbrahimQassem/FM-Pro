import copy
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = PROJECT_ROOT / "tools" / "agent-task.py"
SPEC = importlib.util.spec_from_file_location("agent_task", MODULE_PATH)
agent_task = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(agent_task)


class AgentTaskContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        example_path = PROJECT_ROOT / ".agents/tasks/examples/example-task.json"
        cls.example = json.loads(example_path.read_text(encoding="utf-8"))

    def test_example_contract_is_valid(self):
        validated = agent_task.validate_contract(copy.deepcopy(self.example), PROJECT_ROOT)
        self.assertEqual("EXAMPLE-001", validated["id"])

    def test_path_traversal_is_rejected(self):
        contract = copy.deepcopy(self.example)
        contract["allowed_paths"] = ["../hudhud_fm/lib/"]

        with self.assertRaisesRegex(agent_task.ContractError, "inside FM-Pro"):
            agent_task.validate_contract(contract, PROJECT_ROOT)

    def test_medium_risk_cannot_use_local_auto(self):
        contract = copy.deepcopy(self.example)
        contract["autonomy"] = "local-auto"

        with self.assertRaisesRegex(agent_task.ContractError, "only permits autonomy"):
            agent_task.validate_contract(contract, PROJECT_ROOT)

    def test_protected_scope_is_rejected(self):
        contract = copy.deepcopy(self.example)
        contract["allowed_paths"] = [".github/workflows/"]

        with self.assertRaisesRegex(agent_task.ContractError, "protected path"):
            agent_task.validate_contract(contract, PROJECT_ROOT)

    def test_agent_cannot_modify_its_own_governance(self):
        contract = copy.deepcopy(self.example)
        contract["allowed_paths"] = ["tools/agent-task.py"]

        with self.assertRaisesRegex(agent_task.ContractError, "protected path"):
            agent_task.validate_contract(contract, PROJECT_ROOT)

    def test_scope_accepts_contract_and_allowed_prefix(self):
        data = agent_task.validate_contract(copy.deepcopy(self.example), PROJECT_ROOT)
        task_path = Path(".agents/tasks/P5-01-playback.json")
        agent_task.enforce_scope(
            PROJECT_ROOT / task_path,
            data,
            [
                task_path.as_posix(),
                "app/src/main/java/com/sana/dev/fm/playback/PlaybackController.java",
            ],
        )

    def test_scope_rejects_unlisted_file(self):
        data = agent_task.validate_contract(copy.deepcopy(self.example), PROJECT_ROOT)

        with self.assertRaisesRegex(agent_task.ContractError, "outside allowed_paths"):
            agent_task.enforce_scope(
                PROJECT_ROOT / ".agents/tasks/P5-01-playback.json",
                data,
                ["app/src/main/java/com/sana/dev/fm/ui/MainActivity.java"],
            )

    def test_authorization_cannot_enable_external_writes(self):
        contract = copy.deepcopy(self.example)
        contract["authorization"]["external_writes"] = True

        with self.assertRaisesRegex(agent_task.ContractError, "explicitly disable"):
            agent_task.validate_contract(contract, PROJECT_ROOT)


if __name__ == "__main__":
    unittest.main()
