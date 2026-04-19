import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync, cpSync, lstatSync, realpathSync } from 'fs';
import { dirname, join } from 'node:path';
import { execSync } from 'node:child_process';

// ========== Configuration ==========
const workspaceRoot = '/workspace';
const vscodeExtRoot = join(workspaceRoot, 'packages/vscode-extension');
const autocorrectSrcDir = join(workspaceRoot, 'node_modules/@huacnlee/autocorrect');
const autocorrectDestDir = join(vscodeExtRoot, 'dist/node_modules/@huacnlee/autocorrect');
const packageJsonPath = join(vscodeExtRoot, 'package.json');

// ========== Utility Functions ==========
function log(message) {
  console.log(message);
}

function copyFiles(src, dest, files) {
  mkdirSync(dirname(dest), { recursive: true });
  mkdirSync(dest, { recursive: true });
  
  for (const file of files) {
    const srcPath = join(src, file);
    const destPath = join(dest, file);
    if (existsSync(srcPath)) {
      copyFileSync(srcPath, destPath);
      log(`Copied ${file}`);
    } else {
      console.warn(`Warning: ${file} not found at ${srcPath}`);
    }
  }
}

// ========== Main Process ==========
async function main() {
  // 1. Parse command line arguments
  const mode = process.argv[2] || 'dev';
  log(`Package mode: ${mode}`);
  
  // 2. Set version number
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  const originalVersion = packageJson.version;
  const baseVersion = originalVersion.split('-')[0];
  
  if (mode === 'dev') {
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '')
      .replace(/-/g, '')
      .slice(0, 14);
    packageJson.version = `${baseVersion}-dev.${timestamp}`;
    log(`Dev mode: version set to ${packageJson.version}`);
  } else if (mode === 'stable' || mode === 'prerelease') {
    packageJson.version = baseVersion;
    log(`${mode.charAt(0).toUpperCase() + mode.slice(1)} mode: version set to ${packageJson.version}`);
  } else {
    packageJson.version = baseVersion;
    log(`Prod mode: version set to ${packageJson.version}`);
  }
  
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 4));
  
  // 3. Copy @huacnlee/autocorrect to dist/node_modules
  const autocorrectFiles = ['package.json', 'autocorrect.d.ts', 'autocorrect.js', 'autocorrect_bg.js', 'autocorrect_bg.wasm'];
  
  log('Copying @huacnlee/autocorrect to dist/node_modules...');
  mkdirSync(autocorrectDestDir, { recursive: true });
  for (const file of autocorrectFiles) {
    const srcPath = join(autocorrectSrcDir, file);
    const destPath = join(autocorrectDestDir, file);
    if (existsSync(srcPath)) {
      copyFileSync(srcPath, destPath);
      log(`Copied @huacnlee/autocorrect/${file}`);
    } else {
      console.warn(`Warning: @huacnlee/autocorrect/${file} not found at ${srcPath}`);
    }
  }
  
  // 4. Copy trash module and ALL its dependencies to dist/node_modules
  const trashSrc = join(workspaceRoot, 'node_modules/trash');
  const trashDest = join(vscodeExtRoot, 'dist/node_modules/trash');
  const xdgTrashdirSrc = join(workspaceRoot, 'node_modules/xdg-trashdir');
  const xdgTrashdirDest = join(vscodeExtRoot, 'dist/node_modules/xdg-trashdir');
  
  log('Copying trash module and dependencies to dist/node_modules...');
  
  // Helper to copy entire package with symlink dereferencing
  function copyPackage(src, dest) {
    try {
      // Check if source exists
      if (!existsSync(src)) {
        console.warn(`Warning: Source not found: ${src}`);
        return;
      }
      
      // For symlinks, copy the actual content with dereference
      cpSync(src, dest, { recursive: true, force: true, dereference: true });
      log(`Copied package from ${src} to ${dest}`);
    } catch (error) {
      console.error(`Failed to copy package: ${error.message}`);
    }
  }
  
  // Copy trash and all its dependencies
  copyPackage(trashSrc, trashDest);
  copyPackage(xdgTrashdirSrc, xdgTrashdirDest);
  
  // Copy trash dependencies - resolve symlinks first
  const trashDeps = [
    '@stroncium/procfs',
    'chunkify',
    'globby',
    'is-path-inside',
    'move-file',
    'p-map',
    'powershell-utils',
    'wsl-utils'
  ];
  
  for (const dep of trashDeps) {
    const depSrc = join(workspaceRoot, 'node_modules', dep);
    const depDest = join(vscodeExtRoot, 'dist/node_modules', dep);
    
    // If source is a symlink, resolve it first
    let realSrc = depSrc;
    try {
      const stats = lstatSync(depSrc);
      if (stats.isSymbolicLink()) {
        realSrc = realpathSync(depSrc);
        log(`Resolved symlink: ${depSrc} -> ${realSrc}`);
      }
    } catch (e) {
      // File doesn't exist or other error, use original path
    }
    
    if (existsSync(realSrc)) {
      copyPackage(realSrc, depDest);
    }
  }
  
  // 4b. Copy @cmtx/fpe-wasm to dist/node_modules
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
        log(`Copied @cmtx/fpe-wasm/${file}`);
      } else {
        console.warn(`Warning: @cmtx/fpe-wasm/${file} not found at ${srcPath}`);
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
      log('Copied @cmtx/fpe-wasm/package.json (minimized)');
    } else {
      console.warn('Warning: @cmtx/fpe-wasm/package.json not found at', fpeWasmPkgJsonSrc);
    }
  } else {
    console.error('Error: @cmtx/fpe-wasm/dist not found at', fpeWasmSrc);
    process.exit(1);
  }
  
  // 5. Call vsce package
  const isPreRelease = mode === 'prerelease';
  const preReleaseFlag = isPreRelease ? '--pre-release' : '';
  log('Packaging VSIX...');
  try {
    execSync(`vsce package --no-dependencies ${preReleaseFlag}`, { 
      cwd: vscodeExtRoot, 
      stdio: 'inherit' 
    });
  } catch (error) {
    console.error('Packaging failed!');
    // Restore version number
    packageJson.version = originalVersion;
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 4));
    process.exit(1);
  }
  
  // 6. Restore package.json version number (optional)
  packageJson.version = originalVersion;
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 4));
  log(`Restored package.json version to ${originalVersion}`);
  
  log('Packaging completed successfully!');
}

main();
