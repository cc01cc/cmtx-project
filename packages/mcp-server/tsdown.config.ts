import { defineConfig } from "tsdown";

export default defineConfig({
    entry: {
        index: "src/server.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    platform: "node",
    target: "node22",
    shims: false, // 使用默认值，避免生成不必要的 shim 代码
    external: [
        // 排除 WASM 相关依赖，避免打包问题
        "@huacnlee/autocorrect",
        "*.wasm",
    ],
});
