import { defineConfig } from 'tsdown';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    platform: 'node',
    target: 'node22',
    shims: false, // 使用默认值，避免生成不必要的 shim 代码
    // bundler 目标会生成 import wasm from './xxx.wasm'，需要 copy 到 dist
    copy: ['pkg/cmtx_fpe_wasm_bg.wasm'],
});
