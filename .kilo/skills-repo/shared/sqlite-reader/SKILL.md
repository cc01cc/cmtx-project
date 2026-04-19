---
name: sqlite-reader
description: Query and explore SQLite database files using sqlite3 CLI. Use when inspecting .db or .sqlite files, listing tables, checking schema, or running read-only queries.
license: MIT
---

Read local SQLite database content through the sqlite3 command-line tool.

## When To Use This Skill

Use this skill when requests include:

- Read data from a local `.db` or `.sqlite` file
- List all tables in a SQLite database
- Inspect schema for one table or full database
- Run ad-hoc SELECT queries and summarize results

Do not use this skill for:

- PostgreSQL, MySQL, or other non-SQLite systems
- Destructive SQL unless user explicitly confirms

## Required Inputs

Collect these inputs before execution:

1. Database path.
2. Query goal.
3. Preferred output format (table or csv).

## Workflow

### 1) Check sqlite3 availability

```bash
sqlite3 --version
```

If missing, suggest installation:

- Windows: `winget install SQLite.SQLite`
- macOS: `brew install sqlite`
- Ubuntu/Debian: `sudo apt install sqlite3`

### 2) Verify database can be opened

```bash
sqlite3 "<db_path>" ".databases"
```

### 3) Explore tables and schema

```bash
sqlite3 "<db_path>" ".tables"
sqlite3 "<db_path>" ".schema"
sqlite3 "<db_path>" ".schema <table_name>"
```

### 4) Execute safe read query

```bash
sqlite3 -header -column "<db_path>" "SELECT * FROM <table_name> LIMIT 20;"
```

For machine-friendly parsing:

```bash
sqlite3 -header -csv "<db_path>" "SELECT * FROM <table_name> LIMIT 100;"
```

### 5) Summarize output

- Return concise result summary.
- Highlight row count, notable null fields, and anomalies.
- If output is too large, provide sample rows and ask to paginate.

## Safety Rules

- Never run `DELETE`, `UPDATE`, `INSERT`, `DROP`, `ALTER` without explicit confirmation.
- Always quote database paths.
- Always include `LIMIT` for exploratory SELECT queries.
- Prefer read-only inspection unless user asks otherwise.

## Troubleshooting

- `unable to open database file`: check path, permissions, and file lock.
- `no such table`: run `.tables` and confirm exact table name.
- Garbled text on Windows terminals: run `chcp 65001` before sqlite3.

## Example Prompts

1. "Read data from `data/app.db` and list all tables."
2. "Show schema of `users` table in `main.sqlite`."
3. "Query last 50 rows from `events` table and summarize patterns."
