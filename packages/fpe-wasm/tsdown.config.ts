import { defineConfig } from "tsdown";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    platform: "node",
    target: "node22",
    shims: true, // 启用 shims，为 ESM 注入 __dirname
    // bundler 目标会生成 import wasm from './xxx.wasm'，需要 copy 到 dist
    copy: ["pkg/cmtx_fpe_wasm_bg.wasm"],
});
