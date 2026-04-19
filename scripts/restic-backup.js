// you can check the snapshots for command `restic snapshots -r /mnt/host-data/zeogit-restic`
import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// Configuration
const BACKUP_PATH = process.env.BACKUP_PATH;
const WORKSPACE_PATH = process.env.WORKSPACE_PATH;
const RESTIC_REPO = `${BACKUP_PATH}/zeogit-restic`;
const RESTIC_PASSWORD = process.env.RESTIC_PASSWORD;
const PROJECT_TAG = process.env.PROJECT_TAG || 'cmtx-project';
const INCLUDE_FILE = process.env.RESTIC_INCLUDE_FILE || 'scripts/restic.include';
const EXCLUDE_FILE = process.env.RESTIC_EXCLUDE_FILE || 'scripts/restic.exclude';

async function initializeRepo() {
    try {
        // Try to list snapshots to see if repo exists and password is correct
        await execAsync('restic snapshots');
        console.log('[INFO] [restic] Restic repository already initialized');
    } catch (_error) {
        // If it fails, attempt to initialize. Restic init is idempotent-ish:
        // it fails safely if a config file already exists.
        console.log('[INFO] [restic] Repository not detected. Initializing...');
        try {
            await execAsync('restic init');
            console.log('[OK] [restic] Restic repository initialized successfully');
        } catch (initError) {
            if (initError.message.includes('config file already exists')) {
                console.log('[INFO] [restic] Repository already exists');
            } else {
                throw initError;
            }
        }
    }
}

async function runBackup() {
    try {
        if (!RESTIC_PASSWORD) {
            throw new Error(
                'Restic password not set. Please set RESTIC_PASSWORD environment variable.'
            );
        }

        // Set the environment variables for restic to use automatically
        process.env.RESTIC_REPOSITORY = RESTIC_REPO;
        process.env.RESTIC_PASSWORD = RESTIC_PASSWORD;

        console.log('[INFO] [restic] Starting backup process...');

        // Initialize repository if needed
        await initializeRepo();

        let backupCmd = 'restic backup';

        // Use inclusion file if exists, otherwise fallback to WORKSPACE_PATH
        if (existsSync(INCLUDE_FILE)) {
            console.log(`[INFO] [restic] Using include file: ${INCLUDE_FILE}`);
            backupCmd += ` --files-from "${INCLUDE_FILE}"`;
        } else if (WORKSPACE_PATH) {
            console.log(`[INFO] [restic] Backing up workspace: ${WORKSPACE_PATH}`);
            backupCmd += ` "${WORKSPACE_PATH}"`;
        } else {
            throw new Error('Neither WORKSPACE_PATH nor RESTIC_INCLUDE_FILE is available.');
        }

        // Add exclude file if available
        if (existsSync(EXCLUDE_FILE)) {
            backupCmd += ` --exclude-file "${EXCLUDE_FILE}"`;
        }

        // Create a backup snapshot for this specific project
        const snapshotDate = new Date().toISOString().replace(/[:.]/g, '-');
        backupCmd += ` --tag "${PROJECT_TAG}" --tag "backup-${snapshotDate}"`;

        const { stdout, stderr } = await execAsync(backupCmd);

        console.log('[OK] [restic] Backup completed successfully');
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);

        return true;
    } catch (error) {
        console.error('[FAIL] [restic] Backup failed:', error.message);
        return false;
    }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, performing backup before exit...');
    await runBackup();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('Received SIGINT, performing backup before exit...');
    await runBackup();
    process.exit(0);
});

// Main execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    runBackup()
        .then((success) => {
            if (success) {
                console.log('Backup process completed successfully');
                process.exit(0);
            } else {
                console.error('Backup process failed');
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('Backup process failed with error:', error);
            process.exit(1);
        });
}

export { runBackup };
