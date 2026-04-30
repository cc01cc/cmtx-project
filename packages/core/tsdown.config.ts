import { defineConfig } from "tsdown";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    sourcemap: true,
    platform: "node",
    target: "node22",
    shims: false, // 使用默认值，避免生成不必要的 shim 代码
});
