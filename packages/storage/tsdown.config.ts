import { defineConfig } from "tsdown";

export default defineConfig({
    entry: {
        index: "src/index.ts",
        "adapters/ali-oss": "src/adapters/ali-oss.ts",
        "adapters/tencent-cos": "src/adapters/tencent-cos.ts",
        "adapters/factory": "src/adapters/factory.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    sourcemap: true,
    platform: "node",
    target: "node22",
    shims: false, // 使用默认值，避免生成不必要的 shim 代码
});
