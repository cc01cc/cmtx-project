import * as cp from 'node:child_process';
import * as path from 'node:path';
import { downloadAndUnzipVSCode } from '@vscode/test-electron';

async function main() {
    try {
        // The extension development path should point to the directory containing package.json
        // __dirname is dist/test/test, so we need to go up 3 levels to reach the extension root
        const extensionDevelopmentPath = path.resolve(__dirname, '../../../');
        const extensionTestsPath = path.resolve(__dirname, './suite/index');

        console.log(`Extension development path: ${extensionDevelopmentPath}`);
        console.log(`Extension tests path: ${extensionTestsPath}`);

        // Download VS Code
        const vscodeExecutablePath = await downloadAndUnzipVSCode({ version: 'stable' });

        // On Linux, @vscode/test-electron returns the 'code' binary which is Electron.
        // However, the 'code' binary needs special handling to run as Electron (not Node.js).
        // We need to unset ELECTRON_RUN_AS_NODE and use the resources/app/out/cli.js
        const vscodeDir = path.dirname(vscodeExecutablePath);
        const cliJsPath = path.join(vscodeDir, 'resources/app/out/cli.js');

        console.log(`VS Code directory: ${vscodeDir}`);
        console.log(`CLI JS path: ${cliJsPath}`);

        // Build arguments - these need to be passed to the CLI
        const args = [
            cliJsPath,
            '--no-sandbox',
            '--disable-gpu-sandbox',
            '--disable-updates',
            '--skip-welcome',
            '--skip-release-notes',
            '--disable-workspace-trust',
            `--extensionTestsPath=${extensionTestsPath}`,
            `--extensionDevelopmentPath=${extensionDevelopmentPath}`,
            '--disable-extensions',
            `--extensions-dir=${path.join(vscodeDir, '../../.vscode-test/extensions')}`,
            `--user-data-dir=${path.join(vscodeDir, '../../.vscode-test/user-data')}`,
        ];

        console.log(`Running: ${vscodeExecutablePath} ${args.join(' ')}`);

        // Spawn the process without ELECTRON_RUN_AS_NODE
        const fullEnv = Object.assign({}, process.env);
        fullEnv.ELECTRON_RUN_AS_NODE = undefined;

        const cmd = cp.spawn(vscodeExecutablePath, args, {
            env: fullEnv,
            stdio: 'inherit',
        });

        const exitCode = await new Promise<number>((resolve) => {
            cmd.on('close', (code) => resolve(code ?? 1));
            cmd.on('exit', (code) => resolve(code ?? 1));
        });

        process.exit(exitCode);
    } catch (err) {
        console.error('Failed to run tests:', err);
        process.exit(1);
    }
}

main();
