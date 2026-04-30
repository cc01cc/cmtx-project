import { defineConfig } from "tsdown";

// VS Code 扩展构建配置
// 打包所有依赖进 extension.cjs，保证扩展的独立性
// 通过延迟加载 logger（ensureLoggerInitialized）来避免启动时的 is-stream 问题
//
// WASM 处理说明：
// - 不使用 rolldown-plugin-wasm，因为我们需要完全控制 WASM 加载路径
// - 使用 copy 配置将 WASM 文件复制到 dist/ 目录
// - 使用 loadWasmExtension() 手动加载 WASM，绕过插件的路径解析
export default defineConfig({
    entry: {
        extension: "src/extension.ts",
    },
    format: ["cjs"],
    clean: true,
    platform: "node",
    target: "node22",
    shims: false,
    sourcemap: true,
    fixedExtension: false,
    deps: {
        onlyBundle: false,
        neverBundle: ["vscode", "node:*"],
        // Bundle everything including @cmtx and all dependencies
        alwaysBundle: [/.*/],
    },
    // Copy WASM files from fpe-wasm and autocorrect-wasm packages
    // These files are needed at runtime for encryption and autocorrect features
    // loadWasmExtension() expects them at:
    //   - dist/cmtx_fpe_wasm_bg.wasm
    //   - dist/cmtx_autocorrect_wasm_bg.wasm
    copy: [
        "../fpe-wasm/pkg/cmtx_fpe_wasm_bg.wasm",
        "../autocorrect-wasm/pkg/cmtx_autocorrect_wasm_bg.wasm",
    ],
    // Override Rolldown options to prevent chunk splitting
    // This ensures all code is in a single file, avoiding cross-chunk require issues
    outputOptions: {
        // Disable automatic code splitting
        // For CJS format with single entry, this keeps everything in one file
        manualChunks: () => "extension",
    },
});
