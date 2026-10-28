"""On-demand prerequisites only: no installs, builds, network or credential reads."""
import argparse
import importlib.util
import json
from pathlib import Path
import re
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[2]


def version_output(command):
    try:
        result = subprocess.run(command, cwd=ROOT, capture_output=True,
                                text=True, timeout=10, check=False)
        return result.stdout + result.stderr if result.returncode == 0 else ""
    except (OSError, subprocess.TimeoutExpired):
        return ""


def node_status(output, pin):
    match = re.fullmatch(r"v?(\d+)\.(\d+)\.(\d+)\s*", output)
    if not match:
        return "FAIL", "Node missing, failed, or version unreadable"
    version = tuple(map(int, match.groups()))
    if version[0] != 22 or version < (22, 13, 0):
        return "FAIL", "Node must be 22.13+ within major 22; activate .nvmrc"
    actual = ".".join(match.groups())
    if actual != pin:
        return "WARN", f"Node {actual} is compatible but differs from .nvmrc {pin}"
    return "PASS", f"Node {actual} matches .nvmrc"


def java_status(output):
    match = re.search(r'(?:openjdk|java) version "(\d+)', output)
    if not match or int(match[1]) < 21:
        return "FAIL", "Emulator Java runtime must be 21+ (firebase-tools 15)"
    return "PASS", f"Java {match[1]} satisfies emulator minimum"


def checks(scope):
    # These commands print only versions; raw subprocess output is never emitted.
    if scope in ("all", "tooling", "web", "firebase"):
        yield node_status(version_output(["node", "--version"]),
                          (ROOT / ".nvmrc").read_text().strip())
    if scope in ("all", "tooling"):
        available = importlib.util.find_spec("yaml") is not None
        yield ("PASS" if available else "FAIL",
               "PyYAML available" if available else
               "PyYAML missing; use the isolated tooling environment in the setup guide")
    if scope in ("all", "flutter"):
        for name in ("flutter", "dart"):
            available = shutil.which(name) is not None
            yield ("PASS" if available else "FAIL",
                   f"{name} on PATH (presence only)" if available else f"{name} missing from PATH")
    if scope in ("all", "firebase"):
        yield java_status(version_output(["java", "-version"]))
        installed = ROOT / "node_modules/firebase-tools/package.json"
        try:
            actual = json.loads(installed.read_text())["version"]
            expected = json.loads((ROOT / "package.json").read_text())["devDependencies"]["firebase-tools"]
            valid = actual == expected and (ROOT / "node_modules/.bin/firebase").exists()
            yield ("PASS" if valid else "FAIL",
                   "Local Firebase CLI matches package pin" if valid else
                   "Local Firebase CLI missing or differs from package pin; restore root dependencies")
        except (OSError, ValueError, KeyError):
            yield "FAIL", "Local Firebase CLI unavailable; restore root dependencies"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--scope", choices=("tooling", "flutter", "web", "firebase", "all"),
                        default="tooling")
    args = parser.parse_args()
    results = list(checks(args.scope))
    for status, message in results:
        print(f"{status}: {message}")
    print("Prerequisites only: SDK operation, emulator startup, MCP/trust and device acceptance are not tested.")
    return int(any(status == "FAIL" for status, _ in results))


if __name__ == "__main__":
    raise SystemExit(main())
