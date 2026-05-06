import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        name: "@cmtx/ai",
        globals: true,
        environment: "node",
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            exclude: ["node_modules/", "dist/", "**/*.d.ts", "**/*.test.ts", "vitest.config.ts"],
        },
    },
});
