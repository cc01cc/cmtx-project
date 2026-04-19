---
name: sqlite-reader
description: Query and explore SQLite database files using the sqlite3 CLI. Use when the user asks to read, inspect, or query a .db or .sqlite file, list tables, describe schema, or extract data from a local SQLite database.
license: MIT
argument-hint: Path to the SQLite database file and the query or exploration goal.
---

## Overview

This skill guides the agent to read and query SQLite database files by
invoking the `sqlite3` command-line tool via the terminal. No additional
libraries or MCP servers are required.

## When To Use This Skill

Activate this skill when the user asks things like:

- "Read the data in this .db file"
- "Show me all tables in my SQLite database"
- "Query the users table from app.db"
- "What does the schema look like in this database?"
- "Extract rows from sqlite file matching condition X"

Do not use this skill for:

- PostgreSQL, MySQL, or other non-SQLite databases
- Writing or modifying records (use with caution, always confirm first)
- Large binary BLOBs that cannot be displayed as text

## Required Inputs

Collect before running:

1. **DB path**: absolute or workspace-relative path to the `.db` / `.sqlite` file
2. **Goal**: list tables, describe schema, run a SELECT query, or export data
3. **Output format**: default table, CSV (`-csv`), or JSON-like text

If the path is not provided, ask the user.

## Workflow

### Step 1 - Verify sqlite3 is available

Run in terminal:

```bash
sqlite3 --version
```

If the command is not found, instruct the user to install it:

- Windows: `winget install SQLite.SQLite` or download from https://sqlite.org/download.html
- macOS: `brew install sqlite`
- Linux: `sudo apt install sqlite3`

### Step 2 - List all tables

```bash
sqlite3 "<db_path>" ".tables"
```

### Step 3 - Inspect schema

```bash
sqlite3 "<db_path>" ".schema"
```

Or for a single table:

```bash
sqlite3 "<db_path>" ".schema <table_name>"
```

### Step 4 - Run a SELECT query

Use `-header -column` flags for readable output:

```bash
sqlite3 -header -column "<db_path>" "SELECT * FROM <table_name> LIMIT 20;"
```

For CSV output (easier to parse):

```bash
sqlite3 -header -csv "<db_path>" "SELECT * FROM <table_name> LIMIT 100;"
```

### Step 5 - Interpret and present results

- Parse the terminal output and present data in a Markdown table when feasible.
- If the result is large, summarize row count and show a sample.
- Point out NULL values, data types, or anomalies worth noting.

## Safety Rules

- **Never run DELETE, DROP, UPDATE, or INSERT** without explicit user confirmation.
- Always quote the db path to handle spaces: `"<db_path>"`.
- Use `LIMIT` in all exploratory SELECTs to prevent flooding the terminal.
- If a query produces more than ~200 rows, ask the user whether to paginate or export.

## Common sqlite3 Meta-Commands

| Command | Effect |
| --- | --- |
| `.tables` | List all tables |
| `.schema [table]` | Show CREATE statements |
| `.headers on` | Enable column headers |
| `.mode column` | Align output in columns |
| `.mode csv` | Switch to CSV output |
| `.output file.csv` | Redirect output to file |
| `.quit` | Exit sqlite3 |

## Troubleshooting

- **"unable to open database"**: path is wrong or file is locked by another process.
- **"no such table"**: run `.tables` first to confirm the exact table name.
- **Garbled output on Windows**: run `chcp 65001` before invoking sqlite3 to ensure UTF-8.

## Example Prompts That Activate This Skill

1. "Look at the data in `data/analytics.db` and show me what tables exist."
2. "Query the `events` table in my SQLite file and find entries from last week."
3. "Describe the schema of `app.sqlite` and tell me what the main entities are."
