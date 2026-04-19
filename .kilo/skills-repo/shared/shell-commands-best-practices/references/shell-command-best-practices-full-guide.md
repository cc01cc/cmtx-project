# Shell Command Best Practices - Full Guide

Comprehensive reference guide for shell commands, path handling, and pnpm usage.

## 1. Path Handling Details

### Scenario 1A: Paths Without Spaces → Write Directly

```bash
# ✅ Correct
find /workspace/packages/core -name "*.ts"
cd /home/user/documents
ls /var/log

# ❌ Wrong (extra spaces)
find /workspace / packages / core -name "*.ts"
cd /home / user / documents
ls /var / log
```

Shell parses extra spaces as command separators, causing "command not found" errors.

### Scenario 1B: Paths With Spaces → Must Use Quotes

```bash
# ✅ Correct (double quotes)
cd "/path/to/my project"
find "/home/user/My Documents" -name "*.pdf"

# ✅ Correct (single quotes)
cd '/path/to/my project'

# ❌ Wrong (no quotes)
cd /path/to/my project           # Parsed as multiple commands

# ❌ Wrong (mismatched quotes)
cd "/path/to/my project'
```

Shell splits parameters on whitespace. Quotes tell shell: "treat this entire thing as one parameter."

### Scenario 1C: Variable References → Must Use Double Quotes

```bash
# ✅ Correct
path="/workspace/my project"
find "$path" -name "*.js"

# ❌ Wrong (unquoted, causes word splitting if path has spaces)
find $path -name "*.js"

# ❌ Wrong (single quotes prevent expansion)
find '$path' -name "*.js"        # Literal string "$path"
```

- `$var` unquoted: if value contains spaces, shell splits it into multiple arguments
- `"$var"`: expands then treats as single argument
- `'$var'`: no expansion, literal string

## 2. pnpm Command Rules

### Using `-F` (filter) for Packages

```bash
# ✅ Correct
pnpm -F @cmtx/core build
pnpm --filter @cmtx/core test

# ❌ Wrong (space in package name)
pnpm -F @cmtx / core build

# ❌ Wrong (confusing path with package name)
pnpm -F /workspace/packages/core build
cd /workspace/packages/core && pnpm build  # Not recommended
```

- `@cmtx/core` is a package name where `/` is part of the name
- `-F` expects package name, not file path
- Extra spaces parsed as separate arguments

### Using `-C` for Directory Change (Recommended)

```bash
# ✅ Correct (doesn't modify shell state)
pnpm -C /workspace/packages/core build
pnpm -C "/my project/packages/core" test

# Equivalent to cd'ing but without changing $PWD
```

- `-C` cleanest, clearest scope
- Doesn't modify current working directory
- Script chains won't interfere with each other

### Using `-r` for Recursive

```bash
# ✅ Correct
pnpm -r lint                    # All packages
pnpm -r test -- --coverage     # All packages with coverage
pnpm recurse build

# ❌ Wrong (redundant)
pnpm -r -F @cmtx/core build    # -r already includes all packages
```

## 3. Complex Command Structures

### Variable Assignment and Use

```bash
# ✅ Correct
workspace="/workspace/packages/core"
output_dir="$workspace/output"
find "$output_dir" -name "*.js" -type f

# ✅ Correct (path with spaces)
my_project="/home/user/My Project"
cd "$my_project" && npm install

# ❌ Wrong (unquoted variable)
workspace=/workspace/packages/core
find $workspace -name "*.js"  # Breaks if path has spaces
```

### Pipes and Redirects

```bash
# ✅ Correct
cat "input file.txt" | grep "pattern" > "output file.txt"
find "/workspace" -name "*.log" | xargs rm
grep -r "TODO" "/source code" > "/results/findings.txt"

# ❌ Wrong (unquoted paths)
cat input file.txt | grep pattern > output file.txt
```

### Conditional Execution

```bash
# ✅ Correct
pnpm -F @cmtx/core build && pnpm -F @cmtx/core test
pnpm -C "/my project" build || echo "Build failed"

# ❌ Wrong
cd /my project && pnpm build          # Fails if path has spaces
pnpm -F @cmtx / core build && test    # Package name has space
```

## 4. CLI Tools Reference

### Node.js & npm/pnpm

```bash
# ✅ Paths with spaces need quotes
node "/path/to/my script.js"
npx "@scope/package" --option value
pnpm -C "/my project" test

# ✅ Package names with special chars
npx "@types/node" --version
npm install "@babel/preset-react"
```

### File Find and Manipulation

```bash
# ✅ Correct
find "/path with spaces" -name "*.js"
find /path/without/spaces -name "*.json"
ls "/home/user/My Documents"

# ✅ Recursive grep
grep -r "pattern" "/source code"
grep -r "TODO" "/workspace" --include="*.ts"

# ✅ Batch operations
find "/path" -name "*.tmp" -exec rm {} \;
find "/docs" -name "*.md" | xargs wc -l
```

### Archive Operations

```bash
# ✅ Correct
tar -xzf "my archive.tar.gz" -C "/extract/here"
zip -r "/output/archive.zip" "/source with spaces"

# ❌ Wrong
tar -xzf /output / archive.tar.gz      # Extra spaces in path
```

## 5. Error Correction Table

| Error Pattern | Example | Fix |
|---------------|---------|-----|
| Unwanted spaces in path | `cd /path / to / dir` | `cd /path/to/dir` |
| Unquoted path with spaces | `cd /my project` | `cd "/my project"` |
| Unquoted variable | `find $path` | `find "$path"` |
| Space in package name | `pnpm -F @cmtx / core` | `pnpm -F @cmtx/core` |
| Unquoted glob | `cp *.txt /path with space` | `cp *.txt "/path with space"` |
| Mismatched quotes | `cd "/path'` | `cd "/path"` |
| Mixed escaping | `find /path\ with\ spaces` | `find "/path with spaces"` |

## 6. Debugging & Verification

### Preview Command Expansion

```bash
# ✅ Use echo to preview
path="/my/path"
echo find "$path" -name "*.js"
# Outputs: find /my/path -name "*.js"

# ✅ Use set -x for debugging
set -x
your_command_here
set +x
# Prints full command expansion for each line
```

### Check Path Existence

```bash
# ✅ Verify before use
if [ -d "/path/to/check" ]; then
  echo "Path exists"
else
  echo "Path does not exist"
fi

# ✅ Test layer by layer
ls /
ls /workspace
ls /workspace/packages
ls /workspace/packages/core
```

### Test Permissions and Execution

```bash
# ✅ Check file permissions
ls -la "/path/to/file"

# ✅ Test script executability
test -x "/path/to/script.sh" && echo "Executable"

# ✅ Dry run
echo "Would run: find \"$path\" -name \"*.js\""
```
