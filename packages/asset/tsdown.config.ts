import { defineConfig } from "tsdown";

export default defineConfig({
    entry: {
        index: "src/index.ts",
        upload: "src/upload/index.ts",
        transfer: "src/transfer/index.ts",
        download: "src/download/index.ts",
        config: "src/config/builder.ts",
        file: "src/file/index.ts",
        shared: "src/shared/index.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    platform: "node",
    target: "node22",
    shims: true, // 启用 CJS/ESM shims，确保 import.meta.url 在 CJS 打包时有值
});
