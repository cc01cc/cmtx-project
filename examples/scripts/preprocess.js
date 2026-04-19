import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sourceDir = path.resolve(__dirname, 'data');
const targetDir = path.resolve(__dirname, '..', '.temp');

async function preprocess() {
    try {
        console.log(`[INFO] Copying ${sourceDir} to ${targetDir}...`);

        // Ensure target directory exists and is empty or create it
        await fs.mkdir(targetDir, { recursive: true });

        // Copy directory recursively
        await fs.cp(sourceDir, targetDir, { recursive: true });

        console.log('[OK] Preprocess completed successfully.');
    } catch (error) {
        console.error(`[FAIL] Preprocess failed: ${error.message}`);
        process.exit(1);
    }
}

preprocess();
