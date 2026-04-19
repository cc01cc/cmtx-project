#!/usr/bin/env python3
"""
Validate Plan Mode metadata compliance.

Usage:
  python3 validate-plan.py <file-path>

Checks:
  - File location (.kilo/plans/ directory)
  - YAML frontmatter presence
  - Required fields (title, date)
  - Date format (ISO 8601)

Note: File naming is managed by kilocode, not validated here.
"""

import sys
import re
import os
from pathlib import Path
from datetime import datetime
import yaml


def validate_file_location(file_path):
    """Validate that file is in .kilo/plans/ directory."""
    path = Path(file_path).resolve()
    
    # Check if in .kilo/plans/
    if ".kilo/plans" not in str(path):
        return False, f"❌ Plan file not in .kilo/plans/ directory\n   Location: {path}"
    
    return True, "✅ File location valid (.kilo/plans/)"


def validate_yaml_frontmatter(file_path):
    """Validate YAML frontmatter and required fields."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        return False, f"❌ Cannot read file: {e}"
    
    # Check for frontmatter markers
    if not content.startswith('---'):
        return False, "❌ Missing YAML frontmatter (should start with ---)"
    
    # Extract frontmatter
    try:
        parts = content.split('---', 2)
        if len(parts) < 3:
            return False, "❌ Invalid frontmatter format (missing closing ---)"
        
        frontmatter_str = parts[1]
        metadata = yaml.safe_load(frontmatter_str) or {}
    except yaml.YAMLError as e:
        return False, f"❌ Invalid YAML in frontmatter: {e}"
    
    # Validate required fields
    errors = []
    
    if 'title' not in metadata:
        errors.append("  • Missing required field: title")
    elif not isinstance(metadata['title'], str) or not metadata['title'].strip():
        errors.append("  • Field 'title' must be non-empty string")
    
    if 'date' not in metadata:
        errors.append("  • Missing required field: date")
    else:
        # Validate date format
        date_str = str(metadata['date']).strip()
        if not validate_iso8601_date(date_str):
            errors.append(
                f"  • Field 'date' must be ISO 8601 with timezone\n"
                f"    Got: {date_str}\n"
                f"    Expected format: 2026-04-15T21:51:16+08:00"
            )
    
    if errors:
        return False, "❌ Invalid or missing required fields:\n" + "\n".join(errors)
    
    return True, "✅ YAML frontmatter valid (title, date present)"


def validate_iso8601_date(date_str):
    """Validate ISO 8601 date with timezone."""
    # Pattern: YYYY-MM-DDTHH:MM:SS±HH:MM
    pattern = r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$'
    
    if not re.match(pattern, date_str):
        return False
    
    # Try to parse it
    try:
        # Parse ISO format datetime
        datetime.fromisoformat(date_str)
        return True
    except (ValueError, TypeError):
        return False


def main():
    """Run all validations."""
    if len(sys.argv) < 2:
        print("Usage: python3 validate-plan.py <file-path>")
        print("\nExample:")
        print("  python3 validate-plan.py .kilo/plans/1776264273233-neon-garden.md")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        sys.exit(1)
    
    print(f"\nValidating: {file_path}\n")
    
    # Run all checks
    checks = [
        ("File Location", validate_file_location),
        ("YAML Frontmatter", validate_yaml_frontmatter),
    ]
    
    results = []
    all_passed = True
    
    for check_name, check_func in checks:
        passed, message = check_func(file_path)
        results.append(message)
        all_passed = all_passed and passed
    
    # Print results
    for result in results:
        print(result)
    
    # Summary
    print("\n" + "=" * 60)
    if all_passed:
        print("✅ Plan file is VALID\n")
        sys.exit(0)
    else:
        print("❌ Plan file has ISSUES\n")
        sys.exit(1)


if __name__ == '__main__':
    main()
