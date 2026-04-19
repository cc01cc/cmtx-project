#!/usr/bin/env python3
"""
Document Naming Convention Validator

Validates file names against the document naming convention:
  [CATEGORY-]NUMBER-name.md

Regex: ^(?:[A-Z]+-)?[0-9]+-[A-Za-z0-9\u4e00-\u9fa5_]+\.md$

Usage:
  python validate_doc_naming.py <directory>
  python validate_doc_naming.py <file.md>
"""

import sys
import re
from pathlib import Path
from typing import List, Tuple, Dict


# Naming convention regex
NAMING_REGEX = r'^(?:[A-Z]+-)?[0-9]+-[A-Za-z0-9\u4e00-\u9fa5_]+\.md$'


def validate_filename(filename: str) -> Tuple[bool, str]:
    """
    Validate a single filename against the naming convention.
    
    Returns:
        (is_valid, message)
    """
    if not re.match(NAMING_REGEX, filename):
        return False, f"Does not match naming regex"
    return True, "Valid"


def extract_metadata(filename: str) -> Dict:
    """
    Extract category and number from compliant filename.
    
    Returns:
        dict with keys: category (str or None), number (str), name (str)
    """
    # Parse: [CATEGORY-]NUMBER-name.md
    match = re.match(r'^(?:([A-Z]+)-)([0-9]+)-(.+)\.md$', filename)
    if not match:
        return None
    
    category, number, name = match.groups()
    return {
        'category': category,
        'number': number,
        'name': name,
        'filename': filename,
    }


def check_directory(directory: Path) -> Dict:
    """
    Analyze all .md files in a directory for naming compliance.
    
    Returns:
        dict with counts and details
    """
    md_files = sorted(directory.glob('*.md'))
    
    if len(md_files) < 2:
        return {
            'status': 'exempt',
            'reason': f'Directory has {len(md_files)} file(s); convention applies only to 2+ files',
            'count': len(md_files),
        }
    
    valid_files = []
    invalid_files = []
    metadata_by_category = {}
    
    for file_path in md_files:
        filename = file_path.name
        is_valid, msg = validate_filename(filename)
        
        if is_valid:
            valid_files.append(filename)
            meta = extract_metadata(filename)
            
            # Group by category
            cat = meta['category'] or '__no_category__'
            if cat not in metadata_by_category:
                metadata_by_category[cat] = []
            metadata_by_category[cat].append(meta)
        else:
            invalid_files.append((filename, msg))
    
    # Check for number collisions within categories
    collisions = []
    for cat, metas in metadata_by_category.items():
        numbers = [m['number'] for m in metas]
        seen = {}
        for num in numbers:
            if num in seen:
                collisions.append((cat, num))
            seen[num] = True
    
    return {
        'status': 'evaluated',
        'total_files': len(md_files),
        'valid': len(valid_files),
        'invalid': len(invalid_files),
        'valid_files': valid_files,
        'invalid_files': invalid_files,
        'collisions': collisions,
        'by_category': metadata_by_category,
    }


def print_report(directory: Path, results: Dict) -> None:
    """Pretty-print validation results."""
    print(f"\n{'='*70}")
    print(f"DOCUMENT NAMING VALIDATION REPORT")
    print(f"{'='*70}\n")
    print(f"Directory: {directory.absolute()}\n")
    
    if results['status'] == 'exempt':
        print(f"STATUS: EXEMPT")
        print(f"Reason: {results['reason']}\n")
        return
    
    # Summary
    print(f"Total files: {results['total_files']}")
    print(f"Valid:       {results['valid']}")
    print(f"Invalid:     {results['invalid']}")
    
    if results['collisions']:
        print(f"Collisions:  {len(results['collisions'])}")
    
    # Valid files
    if results['valid_files']:
        print(f"\n{'-'*70}")
        print(f"VALID FILES ({len(results['valid_files'])})\n")
        for fname in results['valid_files']:
            meta = extract_metadata(fname)
            cat = meta['category'] or '(no category)'
            num = meta['number']
            print(f"  ✓ {fname:<50} [{cat}-{num}]")
    
    # Invalid files
    if results['invalid_files']:
        print(f"\n{'-'*70}")
        print(f"INVALID FILES ({len(results['invalid_files'])})\n")
        for fname, reason in results['invalid_files']:
            print(f"  ✗ {fname:<50} ({reason})")
    
    # Collisions
    if results['collisions']:
        print(f"\n{'-'*70}")
        print(f"NUMBERING COLLISIONS\n")
        for cat, num in results['collisions']:
            print(f"  ⚠ Category '{cat}' has duplicate number '{num}'")
    
    # By category summary
    if results['by_category'] and len(results['by_category']) > 1:
        print(f"\n{'-'*70}")
        print(f"SUMMARY BY CATEGORY\n")
        for cat in sorted(results['by_category'].keys()):
            metas = results['by_category'][cat]
            numbers = sorted([int(m['number']) for m in metas])
            cat_display = cat if cat != '__no_category__' else '(no category)'
            print(f"  {cat_display:<20} {len(metas)} file(s), numbers: {numbers}")
    
    print(f"\n{'='*70}\n")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    target = Path(sys.argv[1])
    
    if not target.exists():
        print(f"Error: Path does not exist: {target}", file=sys.stderr)
        sys.exit(1)
    
    if target.is_file():
        # Validate single file
        if not target.suffix == '.md':
            print(f"Error: Not a markdown file: {target}", file=sys.stderr)
            sys.exit(1)
        
        is_valid, msg = validate_filename(target.name)
        print(f"\nFile: {target.name}")
        print(f"Status: {'✓ VALID' if is_valid else '✗ INVALID'}")
        print(f"Message: {msg}\n")
        
        if is_valid:
            meta = extract_metadata(target.name)
            print(f"Category: {meta['category'] or '(none)'}")
            print(f"Number: {meta['number']}")
            print(f"Name: {meta['name']}\n")
        
        sys.exit(0 if is_valid else 1)
    
    elif target.is_dir():
        # Validate directory
        results = check_directory(target)
        print_report(target, results)
        
        # Exit with non-zero if any issues
        invalid_count = results.get('invalid', 0)
        collision_count = len(results.get('collisions', []))
        sys.exit(1 if (invalid_count + collision_count > 0) else 0)
    
    else:
        print(f"Error: Not a file or directory: {target}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
