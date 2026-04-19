/**
 * 基础上传示例
 *
 * 演示最基本的图片上传功能
 *
 * 运行命令：
 *   pnpm exec tsx examples/scripts/gen-demo-data.ts
 *   pnpm exec tsx examples/01-basic-upload.ts
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ConfigBuilder, uploadLocalImageInMarkdown } from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
    console.log('=== 基础上传示例 ===\n');
    console.log('如未生成示例数据，请先运行：pnpm exec tsx examples/scripts/gen-demo-data.ts\n');

    const markdownPath = resolve(__dirname, 'demo-data/docs/local-images.md');

    // 创建模拟存储适配器
    const mockAdapter = {
        async upload(localPath: string, remotePath: string) {
            console.log(`  [模拟上传] ${localPath} -> ${remotePath}`);
            return {
                name: remotePath,
                url: `https://cdn.example.com/${remotePath}`,
            };
        },
    };

    // 构建配置
    const config = new ConfigBuilder()
        .storage(mockAdapter, {
            prefix: 'blog/images/',
            namingPattern: '{name}_{hash}{ext}',
        })
        .replace({
            fields: {
                src: '{cloudSrc}?quality=80',
                alt: '{originalAlt} [已上传]',
            },
        })
        .events(
            (event) => {
                console.log(`[${event.type}]`, event.data || '');
            },
            (level, message, meta) => {
                console.log(`[${level.toUpperCase()}] ${message}`, meta || '');
            }
        )
        .build();

    // 执行上传
    const result = await uploadLocalImageInMarkdown(markdownPath, config);

    console.log('\n=== 上传完成 ===');
    console.log(`成功上传：${result.uploaded} 个图片`);
    console.log(`替换引用：${result.replaced} 处`);
    console.log(`删除本地：${result.deleted} 个文件`);
}

try {
    await main();
} catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ 错误：', message);
    process.exit(1);
}
