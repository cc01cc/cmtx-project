import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        name: "@cmtx/vscode-extension",
        globals: true,
        environment: "node",
        include: ["tests/**/*.test.ts"],
        setupFiles: ["tests/vitest.setup.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html", "lcov"],
            exclude: [
                "node_modules/",
                "dist/",
                "tests/**/*.ts",
                "src/extension.ts",
                "src/providers/**/*.ts",
                "src/test/**",
                "src/infra/editor.ts", // Editor utilities, covered by integration tests
            ],
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 70,
                statements: 80,
            },
        },
        alias: {
            vscode: path.resolve(__dirname, "tests/__mocks__/vscode.ts"),
        },
    },
});
