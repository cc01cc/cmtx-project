import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        name: '@cmtx/publish',
        globals: true,
        environment: 'node',
        setupFiles: ['./tests/vitest.setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'dist/',
                'tests/fixtures/**',
                '**/*.d.ts',
                '**/*.test.ts',
                'vitest.config.ts',
                'tests/vitest.setup.ts',
            ],
        },
    },
});
