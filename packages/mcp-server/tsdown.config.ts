import { defineConfig } from "tsdown";

export default defineConfig({
    entry: {
        server: "bin/cmtx-mcp.ts",
    },
    format: ["esm", "cjs"],
    clean: true,
    platform: "node",
    target: "node22",
    shims: false,
    external: ["@huacnlee/autocorrect", "*.wasm"],
});
