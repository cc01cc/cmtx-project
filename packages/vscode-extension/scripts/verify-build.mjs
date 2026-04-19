/**
 * Post-build verification script
 * Checks that all required files exist
 */

import { existsSync } from 'fs';

const files = [
  './dist/extension.js',
  './dist/node_modules/@cmtx/fpe-wasm/index.cjs',
  './dist/node_modules/@cmtx/fpe-wasm/cmtx_fpe_wasm_bg.wasm',
  './dist/node_modules/@huacnlee/autocorrect/autocorrect.js',
  './dist/node_modules/@huacnlee/autocorrect/autocorrect_bg.wasm',
];

console.log('🔍 Verifying extension build...');

let hasError = false;
for (const file of files) {
  if (!existsSync(file)) {
    console.error('❌ Missing:', file);
    hasError = true;
  } else {
    console.log('✅ Found:', file);
  }
}

if (hasError) {
  console.error('');
  console.error('❌ Build verification failed');
  process.exit(1);
}

console.log('');
console.log('✅ Build verification passed');
process.exit(0);
