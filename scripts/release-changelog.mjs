#!/usr/bin/env node

/**
 * Release Changelog Script
 *
 * After `changeset version` bumps package versions, this script:
 * 1. Reads each package's CHANGELOG.md
 * 2. Finds `## X.Y.Z` headings (including pre-release like `## 0.3.1-alpha.0`)
 * 3. Replaces with `## [X.Y.Z] - YYYY-MM-DD`
 *
 * Usage: node scripts/release-changelog.mjs
 * Must be run AFTER `changeset version` (via postchangeset:version hook).
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

function getDateString() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function readJson(filePath) {
    return JSON.parse(readFileSync(filePath, "utf-8"));
}

// Read config to get the ignore list
const configPath = join(rootDir, ".changeset", "config.json");
if (!existsSync(configPath)) {
    console.error(
        "ERROR: .changeset/config.json not found. Run this script from the project root.",
    );
    process.exit(1);
}
const config = readJson(configPath);
const ignoreSet = new Set(config.ignore || []);

// Scan workspace packages
const packagesDir = join(rootDir, "packages");
if (!existsSync(packagesDir)) {
    console.error("ERROR: packages/ directory not found.");
    process.exit(1);
}

const entries = readdirSync(packagesDir, { withFileTypes: true });
let updatedCount = 0;

for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const pkgDir = join(packagesDir, entry.name);
    const pkgJsonPath = join(pkgDir, "package.json");
    const changelogPath = join(pkgDir, "CHANGELOG.md");

    if (!existsSync(pkgJsonPath) || !existsSync(changelogPath)) continue;

    const pkgName = readJson(pkgJsonPath).name;

    // Skip ignored packages
    if (ignoreSet.has(pkgName)) continue;

    const changelog = readFileSync(changelogPath, "utf-8");

    // Match `## X.Y.Z` headings (including pre-release suffixes like -alpha.0, -beta.1)
    // Does NOT match headings that already have date: `## [X.Y.Z] - 2026-04-30`
    const versionRegex = /^##\s+([\d]+\.[\d]+\.[\d]+(?:-[\w.]+)?)\s*$/m;
    const match = changelog.match(versionRegex);
    if (!match) continue;

    const version = match[1];
    const dateStr = getDateString();
    const versionHeading = `## [${version}] - ${dateStr}`;

    // Replace the version heading
    const newChangelog = changelog.replace(versionRegex, versionHeading);

    writeFileSync(changelogPath, newChangelog, "utf-8");
    console.log(`  [OK] ${pkgName}: ## ${version} -> ## [${version}] - ${dateStr}`);
    updatedCount++;
}

console.log(`\nDone. ${updatedCount} CHANGELOG.md file(s) updated.`);
