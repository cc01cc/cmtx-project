#!/usr/bin/env python3
"""Quick validation for Kilo skill folders.

Usage:
    python quick_validate.py <skill-directory>
"""

from __future__ import annotations

import re
import sys
from pathlib import Path


def parse_frontmatter(text: str) -> str | None:
    match = re.match(r"^---\n(.*?)\n---", text, re.DOTALL)
    return match.group(1) if match else None


def field(frontmatter: str, key: str) -> str | None:
    match = re.search(rf"^{re.escape(key)}:\s*(.+)$", frontmatter, re.MULTILINE)
    return match.group(1).strip() if match else None


def valid_name(name: str) -> bool:
    if len(name) < 1 or len(name) > 64:
        return False
    if name.startswith("-") or name.endswith("-") or "--" in name:
        return False
    return bool(re.fullmatch(r"[a-z0-9-]+", name))


def validate(skill_dir: Path) -> tuple[bool, list[str]]:
    errors: list[str] = []
    skill_md = skill_dir / "SKILL.md"

    if not skill_md.exists():
        return False, ["SKILL.md not found"]

    text = skill_md.read_text(encoding="utf-8")
    fm = parse_frontmatter(text)
    if fm is None:
        return False, ["Missing or invalid YAML frontmatter"]

    name = field(fm, "name")
    desc = field(fm, "description")

    if not name:
        errors.append("Missing required field: name")
    elif not valid_name(name):
        errors.append("Invalid name format")
    elif name != skill_dir.name:
        errors.append(f"name and folder mismatch: {name} != {skill_dir.name}")

    if not desc:
        errors.append("Missing required field: description")
    elif len(desc) > 1024:
        errors.append("description too long (>1024)")

    if "TODO" in text or "TBD" in text:
        errors.append("Unresolved placeholder found")

    return len(errors) == 0, errors


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python quick_validate.py <skill-directory>")
        return 1

    skill_dir = Path(sys.argv[1]).resolve()
    if not skill_dir.is_dir():
        print("[FAIL] Invalid directory")
        return 1

    ok, errors = validate(skill_dir)
    if ok:
        print("[OK] Validation passed")
        return 0

    print("[FAIL] Validation failed")
    for e in errors:
        print(f" - {e}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
