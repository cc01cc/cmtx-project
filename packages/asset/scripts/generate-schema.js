#!/usr/bin/env node
/**
 * Generate JSON Schema from TypeScript types
 *
 * Usage:
 *   node scripts/generate-schema.js
 */

import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

const schemaDir = join(rootDir, "dist", "config");
const outputPath = join(schemaDir, "cmtx.schema.json");

// Ensure output directory exists
mkdirSync(schemaDir, { recursive: true });

console.log("Generating JSON Schema from CmtxConfig type...");

try {
    execSync(
        `ts-json-schema-generator ` +
            `--path src/config/types.ts ` +
            `--type CmtxConfig ` +
            `--out ${outputPath} ` +
            `--no-top-ref`,
        { cwd: rootDir, stdio: "inherit" },
    );
    console.log(`Schema generated: ${outputPath}`);
} catch (error) {
    console.error("Failed to generate schema:", error.message);
    process.exit(1);
}
