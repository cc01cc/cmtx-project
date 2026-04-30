/* eslint-disable no-console */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

// ========== Configuration ==========
const __dirname = dirname(fileURLToPath(import.meta.url));
const vscodeExtRoot = join(__dirname, "..");
const packageJsonPath = join(vscodeExtRoot, "package.json");

// ========== Utility Functions ==========
function log(message) {
    console.log(message);
}

// ========== Main Process ==========
function main() {
    // 1. Parse command line arguments
    const mode = process.argv[2] || "dev";
    log(`Package mode: ${mode}`);

    // 2. Set version number
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    const originalVersion = packageJson.version;
    const baseVersion = originalVersion.split("-")[0];

    if (mode === "dev") {
        const timestamp = new Date()
            .toISOString()
            .replaceAll(/[:.]/g, "")
            .replaceAll("-", "")
            .slice(0, 14);
        packageJson.version = `${baseVersion}-dev.${timestamp}`;
        log(`Dev mode: version set to ${packageJson.version}`);
    } else if (mode === "stable" || mode === "prerelease") {
        packageJson.version = baseVersion;
        log(
            `${
                mode.charAt(0).toUpperCase() + mode.slice(1)
            } mode: version set to ${packageJson.version}`,
        );
    } else {
        packageJson.version = baseVersion;
        log(`Prod mode: version set to ${packageJson.version}`);
    }

    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 4));

    // 3. Call vsce package
    // Extension is fully self-contained with all dependencies bundled by tsdown
    const isPreRelease = mode === "prerelease";
    const command = isPreRelease
        ? "vsce package --no-dependencies --pre-release"
        : "vsce package --no-dependencies";
    log("Packaging VSIX...");

    let packagingFailed = false;
    try {
        execSync(command, {
            cwd: vscodeExtRoot,
            stdio: "inherit",
        });
    } catch (error) {
        packagingFailed = true;
        console.error("Packaging failed!");
        if (error instanceof Error) {
            console.error(`Error details: ${error.message}`);
        } else {
            console.error("Error:", error);
        }
    } finally {
        // Always restore version number
        packageJson.version = originalVersion;
        writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 4));
        log(`Restored package.json version to ${originalVersion}`);
    }

    if (packagingFailed) {
        process.exit(1);
    }

    log("Packaging completed successfully!");
}

// Execute main function with top-level error handling
try {
    main();
} catch (error) {
    console.error("Unexpected error during packaging:", error);
    process.exit(1);
}
