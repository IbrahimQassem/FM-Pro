"""Exercise failure detection without invoking SDKs, networks or project mutations."""
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import check_environment as environment
import validate_skills as skills


class EnvironmentTest(unittest.TestCase):
    def test_unsupported_node_and_unreadable_output_fail(self):
        for output in ("v26.6.0\n", "v22.12.0\n", "v24.12.0\n", "", "private sentinel"):
            status, message = environment.node_status(output, "22.23.4")
            self.assertEqual(status, "FAIL")
            self.assertNotIn("private sentinel", message)

    def test_compatible_unpinned_node_warns(self):
        self.assertEqual(environment.node_status("v22.23.3\n", "22.23.4")[0], "WARN")
        self.assertEqual(environment.node_status("v22.23.4\n", "22.23.4")[0], "PASS")

    def test_java_runtime_not_just_launcher_is_required(self):
        for output in ('openjdk version "17.0.2"', "Unable to locate a Java Runtime", ""):
            self.assertEqual(environment.java_status(output)[0], "FAIL")
        self.assertEqual(environment.java_status('openjdk version "21.0.8"')[0], "PASS")

    def test_command_failures_and_timeouts_are_not_version_evidence(self):
        with patch.object(environment.subprocess, "run", return_value=
                          subprocess.CompletedProcess([], 1, "private stdout", "private stderr")):
            self.assertEqual(environment.version_output(["java", "-version"]), "")
        with patch.object(environment.subprocess, "run", side_effect=subprocess.TimeoutExpired("java", 10)):
            self.assertEqual(environment.version_output(["java", "-version"]), "")


class SkillValidationTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.folder = self.root / ".agents/skills/example"
        self.folder.mkdir(parents=True)
        (self.root / "docs").mkdir()
        (self.root / "docs/contract.md").write_text("# Contract\n")
        self.write_skill("Read `docs/contract.md`.\n")

    def write_skill(self, body):
        (self.folder / "SKILL.md").write_text(
            "---\nname: example\ndescription: Scoped workflow for an example task.\n---\n" + body)

    def errors(self):
        return skills.validate_skill(self.folder, self.root)

    def test_existing_root_and_relative_links_pass(self):
        self.write_skill("Read `docs/contract.md` and [contract](../../../docs/contract.md).\n")
        self.assertEqual(self.errors(), [])

    def test_missing_references_fail_but_external_and_dynamic_examples_do_not(self):
        self.write_skill("[web](https://example.com/page) `docs/releases/<version>/media/`\n")
        self.assertEqual(self.errors(), [])
        self.write_skill("Read `docs/missing.md` and [missing](missing.md).\n")
        self.assertEqual(len(self.errors()), 2)

    def test_outside_reference_and_machine_path_fail(self):
        outside = self.root / "outside.md"
        outside.write_text("fixture")
        self.write_skill(f"[outside]({outside})\n/Users/example/checkout\n")
        self.assertIn("machine-specific home path", self.errors())
        self.write_skill("[outside](../../../../outside.md)\n")
        self.assertTrue(self.errors())

    def test_duplicate_frontmatter_and_malformed_yaml_fail(self):
        for front in ("name: example\nname: example", "name: [broken", "- item"):
            (self.folder / "SKILL.md").write_text(f"---\n{front}\n---\n")
            self.assertTrue(self.errors())

    def test_metadata_invocation_and_policy_are_validated(self):
        (self.folder / "agents").mkdir()
        path = self.folder / "agents/openai.yaml"
        path.write_text('interface:\n  default_prompt: "Use $wrong"\npolicy:\n  allow_implicit_invocation: "false"\n')
        self.assertEqual(len(self.errors()), 2)
        path.write_text('interface:\n  default_prompt: "Use $example"\npolicy:\n  allow_implicit_invocation: false\n')
        self.assertEqual(self.errors(), [])


if __name__ == "__main__":
    unittest.main()
