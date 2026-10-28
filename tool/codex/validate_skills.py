"""Validate repository skills and static file references without invoking skills."""
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit

try:
    import yaml
except ImportError:
    raise SystemExit("PyYAML missing. Use the isolated environment documented in docs/operations/codex-workspace-setup.md.")

ROOT = Path(__file__).resolve().parents[2]
REPO_PREFIXES = (".agents/", "docs/", "lib/", "test/", "tool/", "assets/", "plugins/")


class UniqueLoader(yaml.SafeLoader):
    """Reject ambiguous configuration instead of silently accepting the last key."""


def unique_mapping(loader, node):
    result = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node)
        if key in result:
            raise ValueError("duplicate YAML key")
        result[key] = loader.construct_object(value_node)
    return result


UniqueLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, unique_mapping)


def load_mapping(text):
    result = yaml.load(text, Loader=UniqueLoader)
    if not isinstance(result, dict):
        raise ValueError("YAML must be a mapping")
    return result


def static_references(text):
    """Markdown links are skill-relative; inline repository paths are root-relative.

    Dynamic examples (placeholders, globs, commands) and external URLs are excluded.
    This checks file existence, not Markdown anchors or semantic correctness.
    """
    for target in re.findall(r"\]\(([^\s)]+)\)", text):
        parsed = urlsplit(target)
        if not parsed.scheme and not parsed.netloc and parsed.path:
            yield unquote(parsed.path), False
    for target in re.findall(r"(?<!`)`([^`\n]+)`(?!`)", text):
        if target.startswith(REPO_PREFIXES) and not re.search(r"[\s<>*$|]", target):
            yield target, True


def validate_skill(folder, root=ROOT):
    errors = []
    path = folder / "SKILL.md"
    try:
        text = path.read_text()
        match = re.match(r"\A---\n(.*?)\n---(?:\n|$)", text, re.S)
        if not match:
            return ["missing YAML frontmatter"]
        front = load_mapping(match[1])
        name = front.get("name")
        if (not isinstance(name, str) or name != folder.name or len(name) > 64
                or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name)):
            errors.append("invalid name or folder mismatch")
        description = front.get("description")
        if (not isinstance(description, str) or not 1 <= len(description.strip()) <= 1024
                or any(char in description for char in "<>")):
            errors.append("invalid description")
        if "[TODO:" in text:
            errors.append("unfinished placeholder")
        if re.search(r"(?:/Users/|/home/|[A-Za-z]:\\Users\\)", text):
            errors.append("machine-specific home path")
        metadata_path = folder / "agents/openai.yaml"
        if metadata_path.exists():
            metadata = load_mapping(metadata_path.read_text())
            interface = metadata.get("interface", {})
            if not isinstance(interface, dict):
                errors.append("interface must be a mapping")
            else:
                for key, value in interface.items():
                    if not isinstance(value, str) or not value.strip():
                        errors.append(f"invalid interface field: {key}")
                short = interface.get("short_description")
                if short is not None and (not isinstance(short, str) or not 25 <= len(short) <= 64):
                    errors.append("short_description must be 25-64 characters")
                prompt = interface.get("default_prompt")
                if prompt is not None and (not isinstance(prompt, str) or f"${name}" not in prompt):
                    errors.append("default_prompt must invoke the skill")
                for key in ("icon_small", "icon_large"):
                    value = interface.get(key)
                    if isinstance(value, str) and not (folder / value).is_file():
                        errors.append(f"missing {key} file")
            policy = metadata.get("policy", {})
            if not isinstance(policy, dict) or ("allow_implicit_invocation" in policy
                    and not isinstance(policy["allow_implicit_invocation"], bool)):
                errors.append("invalid invocation policy")
        for target, from_root in static_references(text):
            resolved = ((root if from_root else folder) / target).resolve()
            if not resolved.is_relative_to(root.resolve()) or not resolved.exists():
                errors.append(f"missing or out-of-repository reference: {target}")
    except (OSError, ValueError, TypeError, yaml.YAMLError):
        errors.append("unreadable skill or malformed YAML")
    return errors


def main():
    paths = sorted((ROOT / ".agents/skills").glob("*/SKILL.md"))
    paths += sorted((ROOT / "plugins").glob("*/skills/*/SKILL.md"))
    if not paths:
        print("FAIL: no project skills found")
        return 1
    names = set()
    failed = False
    for path in paths:
        errors = validate_skill(path.parent)
        if path.parent.name in names:
            errors.append("duplicate skill folder name")
        names.add(path.parent.name)
        failed |= bool(errors)
        print(f"{'FAIL' if errors else 'PASS'}: {path.parent.relative_to(ROOT)}")
        for error in errors:
            print(f"  {error}")
    print(f"Checked {len(paths)} skills; structural checks do not prove runtime discovery or behavior.")
    return int(failed)


if __name__ == "__main__":
    sys.exit(main())
