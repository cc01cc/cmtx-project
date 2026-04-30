import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        include: ["tests/integration/**/*.test.ts"],
        exclude: ["**/node_modules/**", "**/dist/**", "tests/adapters/**"],
        testTimeout: 60000,
        hookTimeout: 30000,
        reporters: ["verbose"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            exclude: ["**/node_modules/**", "**/tests/**", "**/*.test.ts"],
        },
    },
    resolve: {
        alias: {
            "@": resolve(__dirname, "src"),
        },
    },
});
