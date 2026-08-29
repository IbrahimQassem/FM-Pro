#!/usr/bin/env python3
"""Validate and enforce bounded FM-Pro agent task contracts."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any, Iterable


PROJECT_ROOT = Path(__file__).resolve().parent.parent

REQUIRED_FIELDS = {
    "version",
    "repository",
    "id",
    "title",
    "objective",
    "roadmap_ref",
    "base_branch",
    "risk",
    "autonomy",
    "owner_role",
    "implementation_skill",
    "allowed_paths",
    "acceptance",
    "verification_gates",
    "rollback",
    "authorization",
}

AUTONOMY_BY_RISK = {
    "low": {"local-auto", "pr-only"},
    "medium": {"pr-only"},
    "high": {"plan-only"},
    "critical": {"plan-only"},
}

GATE_COMMANDS = {
    "governance": ["./tools/verify-governance.sh"],
    "technical-debt": ["./tools/audit-technical-debt.sh"],
    "firebase-rules": ["npm", "run", "emulators:test"],
    "unit-hudhud-official": [
        "./gradlew",
        "testHudhudOfficialDebugUnitTest",
        "--no-daemon",
    ],
    "build-hudhud-official": [
        "./gradlew",
        "app:assembleHudhudOfficialDebug",
        "--no-daemon",
    ],
    "build-hudhud-dev": [
        "./gradlew",
        "app:assembleHudhudDevDebug",
        "--no-daemon",
    ],
    "build-listener-variants": [
        "./gradlew",
        "app:assembleHudhudOfficialDebug",
        "app:assembleHudhudDevDebug",
        "--no-daemon",
    ],
    "lint-hudhud-official": [
        "./gradlew",
        "app:lintHudhudOfficialDebug",
        "--no-daemon",
    ],
}

BROAD_SCOPE_PATHS = {
    ".agents",
    ".github",
    "app",
    "docs",
    "gradle",
    "tests",
    "tools",
}

PROTECTED_PREFIXES = (
    ".agents/roles/",
    ".agents/skills/",
    ".github/",
    "docs/contracts/",
    "gradle/wrapper/",
)

PROTECTED_FILES = {
    ".agents/README.md",
    "AGENTS.md",
    "build.gradle",
    "settings.gradle",
    "gradle.properties",
    "firestore.rules",
    "storage.rules",
    "app/build.gradle",
    "app/google-services.json",
    "key.properties",
    "tools/agent-task.py",
    "tools/verify-governance.sh",
}

SENSITIVE_SUFFIXES = (
    ".jks",
    ".keystore",
    ".p12",
    ".pem",
    ".key",
)


class ContractError(ValueError):
    """Raised when a task contract violates the automation boundary."""


def _read_json(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ContractError(f"task contract does not exist: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ContractError(f"invalid JSON at line {exc.lineno}: {exc.msg}") from exc
    if not isinstance(data, dict):
        raise ContractError("task contract root must be a JSON object")
    return data


def _require_text(data: dict[str, Any], field: str, minimum: int = 1) -> str:
    value = data.get(field)
    if not isinstance(value, str) or len(value.strip()) < minimum:
        raise ContractError(f"{field} must be a non-empty string")
    return value.strip()


def _normalize_relative_path(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ContractError(f"{field} entries must be non-empty strings")
    raw = value.strip()
    if "\\" in raw or any(character in raw for character in "*?["):
        raise ContractError(f"{field} must use literal POSIX paths: {raw}")
    path = PurePosixPath(raw)
    if path.is_absolute() or ".." in path.parts or raw in {".", "./"}:
        raise ContractError(f"{field} must stay inside FM-Pro: {raw}")
    normalized = path.as_posix()
    if raw.endswith("/"):
        normalized += "/"
    return normalized


def _strip_explicit_relative_prefix(path: str) -> str:
    return path[2:] if path.startswith("./") else path


def is_protected_path(path: str) -> bool:
    normalized = _strip_explicit_relative_prefix(PurePosixPath(path).as_posix())
    name = PurePosixPath(normalized).name.lower()
    if normalized in PROTECTED_FILES:
        return True
    if normalized.startswith(PROTECTED_PREFIXES):
        return True
    if name.startswith(".env") or name == "google-services.json":
        return True
    return name.endswith(SENSITIVE_SUFFIXES)


def is_path_allowed(path: str, allowed_paths: Iterable[str], task_path: str) -> bool:
    normalized = _strip_explicit_relative_prefix(PurePosixPath(path).as_posix())
    normalized_task = _strip_explicit_relative_prefix(PurePosixPath(task_path).as_posix())
    if normalized == normalized_task:
        return True
    for allowed in allowed_paths:
        prefix = allowed.rstrip("/")
        if normalized == prefix or (allowed.endswith("/") and normalized.startswith(allowed)):
            return True
    return False


def validate_contract(data: dict[str, Any], root: Path = PROJECT_ROOT) -> dict[str, Any]:
    missing = sorted(REQUIRED_FIELDS - data.keys())
    unknown = sorted(data.keys() - REQUIRED_FIELDS)
    if missing:
        raise ContractError(f"missing required fields: {', '.join(missing)}")
    if unknown:
        raise ContractError(f"unknown fields are not allowed: {', '.join(unknown)}")
    if data["version"] != 1:
        raise ContractError("version must be 1")
    if data["repository"] != "FM-Pro":
        raise ContractError("repository must be exactly FM-Pro")

    task_id = _require_text(data, "id")
    if not re.fullmatch(r"[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+", task_id):
        raise ContractError("id must use uppercase segments such as P5-01 or TASK-123")
    _require_text(data, "title", 5)
    _require_text(data, "objective", 20)
    roadmap_ref = _require_text(data, "roadmap_ref")
    if not roadmap_ref.startswith("docs/roadmap/phased-delivery-plan.md#"):
        raise ContractError("roadmap_ref must target the authoritative phased delivery plan")
    base_branch = _require_text(data, "base_branch")
    if not re.fullmatch(r"[A-Za-z0-9._/-]+", base_branch) or ".." in base_branch:
        raise ContractError("base_branch contains unsafe characters")

    risk = data.get("risk")
    autonomy = data.get("autonomy")
    if risk not in AUTONOMY_BY_RISK:
        raise ContractError(f"risk must be one of: {', '.join(AUTONOMY_BY_RISK)}")
    if autonomy not in AUTONOMY_BY_RISK[risk]:
        allowed = ", ".join(sorted(AUTONOMY_BY_RISK[risk]))
        raise ContractError(f"risk {risk} only permits autonomy: {allowed}")

    owner_role = _normalize_relative_path(data.get("owner_role"), "owner_role")
    implementation_skill = _normalize_relative_path(
        data.get("implementation_skill"), "implementation_skill"
    )
    if not owner_role.startswith(".agents/roles/") or not owner_role.endswith(".md"):
        raise ContractError("owner_role must reference .agents/roles/<role>.md")
    if not implementation_skill.startswith(".agents/skills/") or not implementation_skill.endswith(
        "/SKILL.md"
    ):
        raise ContractError("implementation_skill must reference .agents/skills/<skill>/SKILL.md")
    for field, relative in (("owner_role", owner_role), ("implementation_skill", implementation_skill)):
        if not (root / relative).is_file():
            raise ContractError(f"{field} does not exist: {relative}")

    raw_paths = data.get("allowed_paths")
    if not isinstance(raw_paths, list) or not raw_paths:
        raise ContractError("allowed_paths must be a non-empty array")
    allowed_paths = [_normalize_relative_path(value, "allowed_paths") for value in raw_paths]
    if len(set(allowed_paths)) != len(allowed_paths):
        raise ContractError("allowed_paths contains duplicates")
    for allowed_path in allowed_paths:
        if allowed_path.rstrip("/") in BROAD_SCOPE_PATHS:
            raise ContractError(f"allowed_paths entry is too broad: {allowed_path}")
        if is_protected_path(allowed_path.rstrip("/")):
            raise ContractError(f"protected path is outside agent automation: {allowed_path}")

    acceptance = data.get("acceptance")
    if not isinstance(acceptance, list) or not acceptance:
        raise ContractError("acceptance must be a non-empty array")
    if any(not isinstance(item, str) or len(item.strip()) < 10 for item in acceptance):
        raise ContractError("each acceptance item must be a meaningful string")

    gates = data.get("verification_gates")
    if not isinstance(gates, list) or not gates:
        raise ContractError("verification_gates must be a non-empty array")
    unknown_gates = [gate for gate in gates if gate not in GATE_COMMANDS]
    if unknown_gates:
        raise ContractError(f"unknown verification gates: {', '.join(map(str, unknown_gates))}")
    if len(set(gates)) != len(gates):
        raise ContractError("verification_gates contains duplicates")
    if "governance" not in gates:
        raise ContractError("verification_gates must include governance")

    _require_text(data, "rollback", 15)
    authorization = data.get("authorization")
    expected_authorization = {
        "external_writes": False,
        "production_changes": False,
        "destructive_actions": False,
    }
    if authorization != expected_authorization:
        raise ContractError(
            "authorization must explicitly disable external_writes, production_changes, "
            "and destructive_actions"
        )

    validated = dict(data)
    validated["owner_role"] = owner_role
    validated["implementation_skill"] = implementation_skill
    validated["allowed_paths"] = allowed_paths
    return validated


def load_and_validate(path: Path, root: Path = PROJECT_ROOT) -> dict[str, Any]:
    return validate_contract(_read_json(path), root)


def _git(*arguments: str, check: bool = True) -> str:
    result = subprocess.run(
        ["git", *arguments],
        cwd=PROJECT_ROOT,
        check=False,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if check and result.returncode != 0:
        message = result.stderr.strip() or result.stdout.strip()
        raise ContractError(f"git {' '.join(arguments)} failed: {message}")
    return result.stdout


def changed_files(base_ref: str, head_ref: str, include_working_tree: bool = False) -> list[str]:
    output = _git("diff", "--name-only", "--diff-filter=ACMRD", f"{base_ref}...{head_ref}")
    paths = {line.strip() for line in output.splitlines() if line.strip()}
    if include_working_tree:
        for arguments in (
            ("diff", "--name-only", "--diff-filter=ACMRD"),
            ("diff", "--cached", "--name-only", "--diff-filter=ACMRD"),
            ("ls-files", "--others", "--exclude-standard"),
        ):
            paths.update(line.strip() for line in _git(*arguments).splitlines() if line.strip())
    return sorted(paths)


def _task_relative_path(path: Path) -> str:
    try:
        return path.resolve().relative_to(PROJECT_ROOT).as_posix()
    except ValueError as exc:
        raise ContractError("task contract must be inside FM-Pro") from exc


def enforce_scope(task_path: Path, data: dict[str, Any], paths: Iterable[str]) -> None:
    relative_task = _task_relative_path(task_path)
    violations = []
    for path in paths:
        if is_protected_path(path):
            violations.append(f"protected: {path}")
        elif not is_path_allowed(path, data["allowed_paths"], relative_task):
            violations.append(f"outside allowed_paths: {path}")
    if violations:
        raise ContractError("scope violations:\n- " + "\n- ".join(violations))


def discover_task_contracts(base_ref: str, head_ref: str) -> list[str]:
    return [
        path
        for path in changed_files(base_ref, head_ref)
        if path.startswith(".agents/tasks/")
        and path.count("/") == 2
        and path.endswith(".json")
    ]


def command_validate(args: argparse.Namespace) -> None:
    data = load_and_validate(args.task)
    print(f"Valid agent task contract: {data['id']} ({data['risk']}, {data['autonomy']})")


def command_preflight(args: argparse.Namespace) -> None:
    data = load_and_validate(args.task)
    top_level = Path(_git("rev-parse", "--show-toplevel").strip()).resolve()
    if top_level != PROJECT_ROOT:
        raise ContractError(f"run from the FM-Pro repository: {PROJECT_ROOT}")
    branch = _git("branch", "--show-current").strip()
    if not branch:
        raise ContractError("preflight requires a named work branch")
    if branch in {data["base_branch"], "main"}:
        raise ContractError(f"refusing agent implementation on protected/base branch: {branch}")
    base_exists = any(
        _git("rev-parse", "--verify", "--quiet", candidate, check=False).strip()
        for candidate in (
            f"refs/heads/{data['base_branch']}",
            f"refs/remotes/origin/{data['base_branch']}",
        )
    )
    if not base_exists:
        raise ContractError(f"base_branch does not exist locally or on origin: {data['base_branch']}")
    relative_task = _task_relative_path(args.task)
    dirty_paths = {
        line[3:].strip()
        for line in _git("status", "--porcelain").splitlines()
        if len(line) >= 4 and line[3:].strip()
    }
    unexpected_dirty_paths = sorted(dirty_paths - {relative_task})
    if unexpected_dirty_paths:
        raise ContractError(
            "preflight found unrelated existing changes:\n- " + "\n- ".join(unexpected_dirty_paths)
        )
    print(f"Preflight passed for {data['id']} on branch {branch}.")


def command_scope(args: argparse.Namespace) -> None:
    data = load_and_validate(args.task)
    paths = changed_files(args.base_ref, args.head_ref, args.include_working_tree)
    if not paths:
        raise ContractError("no changed files found for the requested comparison")
    enforce_scope(args.task, data, paths)
    print(f"Scope passed for {data['id']}: {len(paths)} changed file(s).")


def command_discover(args: argparse.Namespace) -> None:
    tasks = discover_task_contracts(args.base_ref, args.head_ref)
    if args.require_one and len(tasks) != 1:
        raise ContractError(f"agent-change PR must add or modify exactly one task contract; found {len(tasks)}")
    for task in tasks:
        print(task)


def command_run_gates(args: argparse.Namespace) -> None:
    data = load_and_validate(args.task)
    results = []
    failed = False
    for gate in data["verification_gates"]:
        command = GATE_COMMANDS[gate]
        print(f"==> {gate}: {' '.join(command)}", flush=True)
        started_at = datetime.now(timezone.utc).isoformat()
        result = subprocess.run(command, cwd=PROJECT_ROOT, check=False)
        results.append(
            {
                "gate": gate,
                "command": command,
                "started_at": started_at,
                "exit_code": result.returncode,
                "status": "passed" if result.returncode == 0 else "failed",
            }
        )
        if result.returncode != 0:
            failed = True
            break

    report = {
        "task_id": data["id"],
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "results": results,
        "status": "failed" if failed else "passed",
    }
    report_dir = PROJECT_ROOT / "build" / "reports" / "agent-task"
    report_dir.mkdir(parents=True, exist_ok=True)
    report_path = report_dir / f"{data['id'].lower()}.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Gate report: {report_path.relative_to(PROJECT_ROOT)}")
    if failed:
        raise ContractError("verification stopped at the first failed gate")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    validate = subparsers.add_parser("validate", help="validate one task contract")
    validate.add_argument("task", type=Path)
    validate.set_defaults(handler=command_validate)

    preflight = subparsers.add_parser("preflight", help="validate repository and branch safety")
    preflight.add_argument("task", type=Path)
    preflight.set_defaults(handler=command_preflight)

    scope = subparsers.add_parser("scope", help="enforce changed files against allowed_paths")
    scope.add_argument("task", type=Path)
    scope.add_argument("--base-ref", required=True)
    scope.add_argument("--head-ref", default="HEAD")
    scope.add_argument("--include-working-tree", action="store_true")
    scope.set_defaults(handler=command_scope)

    discover = subparsers.add_parser("discover", help="find top-level changed task contracts")
    discover.add_argument("--base-ref", required=True)
    discover.add_argument("--head-ref", required=True)
    discover.add_argument("--require-one", action="store_true")
    discover.set_defaults(handler=command_discover)

    gates = subparsers.add_parser("run-gates", help="run fixed verification gates")
    gates.add_argument("task", type=Path)
    gates.set_defaults(handler=command_run_gates)
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        args.handler(args)
    except ContractError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
