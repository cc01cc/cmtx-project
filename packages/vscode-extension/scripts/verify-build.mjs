/* eslint-disable no-console */

/**
 * Post-build verification script
 * Checks that all required files exist
 */

import { existsSync } from "fs";

const files = [
    "./dist/extension.cjs",
    "./dist/cmtx_fpe_wasm_bg.wasm",
    "./dist/cmtx_autocorrect_wasm_bg.wasm",
];

console.log("🔍 Verifying extension build...");

let hasError = false;
for (const file of files) {
    if (!existsSync(file)) {
        console.error("❌ Missing:", file);
        hasError = true;
    } else {
        console.log("✅ Found:", file);
    }
}

if (hasError) {
    console.error("");
    console.error("❌ Build verification failed");
    process.exit(1);
}

console.log("");
console.log("✅ Build verification passed");
process.exit(0);
