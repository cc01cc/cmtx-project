/**
 * Copy WASM files to dist/node_modules for VS Code extension
 * This script is called during build to prepare WASM dependencies
 */

import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const workspaceRoot = '/workspace';
const vscodeExtRoot = join(workspaceRoot, 'packages/vscode-extension');

function log(message) {
  console.log(message);
}

function copyWasmDependencies() {
  let hasError = false;

  // 1. Copy @huacnlee/autocorrect to dist/node_modules
  const autocorrectSrcDir = join(workspaceRoot, 'node_modules/@huacnlee/autocorrect');
  const autocorrectDestDir = join(vscodeExtRoot, 'dist/node_modules/@huacnlee/autocorrect');
  const autocorrectFiles = ['package.json', 'autocorrect.d.ts', 'autocorrect.js', 'autocorrect_bg.js', 'autocorrect_bg.wasm'];

  log('Copying @huacnlee/autocorrect to dist/node_modules...');
  mkdirSync(autocorrectDestDir, { recursive: true });
  for (const file of autocorrectFiles) {
    const srcPath = join(autocorrectSrcDir, file);
    const destPath = join(autocorrectDestDir, file);
    if (existsSync(srcPath)) {
      copyFileSync(srcPath, destPath);
      log(`  Copied @huacnlee/autocorrect/${file}`);
    } else {
      console.warn(`  Warning: @huacnlee/autocorrect/${file} not found at ${srcPath}`);
      if (file === 'autocorrect.js' || file === 'autocorrect_bg.wasm') {
        hasError = true;
      }
    }
  }

  // 2. Copy @cmtx/fpe-wasm to dist/node_modules
  const fpeWasmSrc = join(workspaceRoot, 'packages/fpe-wasm/dist');
  const fpeWasmDest = join(vscodeExtRoot, 'dist/node_modules/@cmtx/fpe-wasm');
  const fpeWasmPkgJsonSrc = join(workspaceRoot, 'packages/fpe-wasm/package.json');

  log('Copying @cmtx/fpe-wasm to dist/node_modules...');
  if (existsSync(fpeWasmSrc)) {
    const fpeWasmFiles = [
      'index.cjs',
      'cmtx_fpe_wasm_bg.wasm'
    ];
    mkdirSync(fpeWasmDest, { recursive: true });
    for (const file of fpeWasmFiles) {
      const srcPath = join(fpeWasmSrc, file);
      const destPath = join(fpeWasmDest, file);
      if (existsSync(srcPath)) {
        copyFileSync(srcPath, destPath);
        log(`  Copied @cmtx/fpe-wasm/${file}`);
      } else {
        console.warn(`  Warning: @cmtx/fpe-wasm/${file} not found at ${srcPath}`);
        hasError = true;
      }
    }

    // Copy and minimize package.json (only keep required fields)
    if (existsSync(fpeWasmPkgJsonSrc)) {
      const pkgJson = JSON.parse(readFileSync(fpeWasmPkgJsonSrc, 'utf-8'));
      const minimalPkgJson = {
        name: pkgJson.name,
        version: pkgJson.version,
        main: './index.cjs',
        type: 'module'
      };
      writeFileSync(join(fpeWasmDest, 'package.json'), JSON.stringify(minimalPkgJson, null, 2));
      log('  Copied @cmtx/fpe-wasm/package.json (minimized)');
    } else {
      console.warn('  Warning: @cmtx/fpe-wasm/package.json not found at', fpeWasmPkgJsonSrc);
    }
  } else {
    console.error('  Error: @cmtx/fpe-wasm/dist not found at', fpeWasmSrc);
    hasError = true;
  }

  if (hasError) {
    console.error('');
    console.error('WASM dependency copy failed');
    process.exit(1);
  }

  log('WASM dependencies copied successfully');
}

copyWasmDependencies();
