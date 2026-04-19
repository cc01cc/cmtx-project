#!/usr/bin/env python3
"""Scaffold a Kilo skill directory and SKILL.md.

Usage:
    python3 init_kilo_skill.py --name my-skill --scope project --root .
    python3 init_kilo_skill.py --name my-skill --scope global --home C:/Users/you
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path


SKILL_TEMPLATE = """---
name: {name}
description: {description}
license: MIT
---

## Overview

Describe what this skill does and when to use it.

## When To Use This Skill

- Add concrete trigger scenarios.

## Workflow

1. Step 1.
2. Step 2.
3. Step 3.

## Validation

- Name matches folder.
- Description includes capability and trigger context.
"""


def valid_name(name: str) -> bool:
    if len(name) < 1 or len(name) > 64:
        return False
    if name.startswith("-") or name.endswith("-") or "--" in name:
        return False
    return bool(re.fullmatch(r"[a-z0-9-]+", name))


def base_dir(scope: str, root: Path, home: Path) -> Path:
    if scope == "project":
        return root / ".kilo" / "skills"
    return home / ".kilo" / "skills"


def main() -> int:
    parser = argparse.ArgumentParser(description="Initialize a Kilo skill")
    parser.add_argument("--name", required=True, help="Skill name, for example: markdown-review")
    parser.add_argument("--scope", choices=["project", "global"], default="project")
    parser.add_argument("--root", default=".", help="Project root for project scope")
    parser.add_argument("--home", default=str(Path.home()), help="Home path for global scope")
    parser.add_argument(
        "--description",
        default="Describe capability and trigger conditions clearly.",
        help="Initial frontmatter description",
    )

    args = parser.parse_args()

    if not valid_name(args.name):
        print("[FAIL] Invalid skill name. Use lowercase letters, digits, and hyphens.")
        return 1

    target = base_dir(args.scope, Path(args.root).resolve(), Path(args.home).resolve()) / args.name
    if target.exists():
        print(f"[FAIL] Target already exists: {target}")
        return 1

    target.mkdir(parents=True, exist_ok=False)
    (target / "SKILL.md").write_text(
        SKILL_TEMPLATE.format(name=args.name, description=args.description),
        encoding="utf-8",
    )
    (target / "scripts").mkdir(exist_ok=True)
    (target / "references").mkdir(exist_ok=True)

    print(f"[OK] Created skill scaffold at: {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
