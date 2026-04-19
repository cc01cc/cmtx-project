import { defineConfig } from 'tsdown';

export default defineConfig({
    entry: {
        index: 'src/index.ts',
        upload: 'src/upload/index.ts',
        transfer: 'src/transfer/index.ts',
        download: 'src/download/index.ts',
        config: 'src/config/builder.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    platform: 'node',
    target: 'node22',
    shims: false, // 使用默认值，避免生成不必要的 shim 代码
});
