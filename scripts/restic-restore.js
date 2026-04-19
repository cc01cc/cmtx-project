// Restoring from backup — restic 0.18.1 documentation:  <https://restic.readthedocs.io/en/stable/050_restore.html>
import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// Configuration
const BACKUP_PATH = process.env.BACKUP_PATH;
const _WORKSPACE_PATH = process.env.WORKSPACE_PATH;
const RESTIC_REPO = `${BACKUP_PATH}/zeogit-restic`;
const RESTIC_PASSWORD = process.env.RESTIC_PASSWORD;
const PROJECT_TAG = process.env.PROJECT_TAG || 'cmtx-project';
const INCLUDE_FILE = process.env.RESTIC_INCLUDE_FILE || 'scripts/restic.include';

// Health check: Determine if restoration is possible
async function isRestorationPossible() {
    try {
        // Check if restic repository exists and has snapshots for THIS project
        const { stdout } = await execAsync(`restic snapshots --tag "${PROJECT_TAG}" --json`);
        const snapshots = JSON.parse(stdout);
        return snapshots.length > 0;
    } catch (error) {
        console.warn('[WARN] Could not determine if snapshots exist:', error.message);
        return false;
    }
}

async function runRestore() {
    try {
        if (!RESTIC_PASSWORD) {
            throw new Error(
                'Restic password not set. Please set RESTIC_PASSWORD environment variable.'
            );
        }

        // Set the environment variables for restic to use automatically
        process.env.RESTIC_REPOSITORY = RESTIC_REPO;
        process.env.RESTIC_PASSWORD = RESTIC_PASSWORD;

        // Check if restoration is possible
        const canRestore = await isRestorationPossible();
        if (!canRestore) {
            console.log(
                '[INFO] [restic] No snapshots found for this project, skipping restoration.'
            );
            return true;
        }

        console.log(
            '[INFO] [restic] Starting intelligent restore process (delegating comparison to restic)...'
        );

        let restoreCmd = `restic restore latest --tag "${PROJECT_TAG}" --target "/" --overwrite if-newer`;

        // Support partial restore from include file if available
        if (existsSync(INCLUDE_FILE)) {
            console.log(`[INFO] [restic] Using include file for partial restore: ${INCLUDE_FILE}`);
            restoreCmd += ` --include-file "${INCLUDE_FILE}"`;
        }

        const { stdout, stderr } = await execAsync(restoreCmd);

        console.log('[OK] [restic] Restore/Sync completed successfully');
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);

        return true;
    } catch (error) {
        console.error('[FAIL] [restic] Restore failed:', error.message);
        return false;
    }
}

// Main execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    runRestore()
        .then((success) => {
            if (success) {
                console.log('Restore process completed successfully');
                process.exit(0);
            } else {
                console.error('Restore process failed');
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('Restore process failed with error:', error);
            process.exit(1);
        });
}

export { runRestore };
