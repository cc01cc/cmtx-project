/**
 * 字段模板配置示例
 *
 * 演示如何使用高级字段模板配置
 *
 * 运行命令：
 *   pnpm exec tsx examples/scripts/gen-demo-data.ts
 *   pnpm exec tsx examples/02-field-templates.ts
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ConfigBuilder, uploadLocalImageInMarkdown } from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
    console.log('=== 字段模板配置示例 ===\n');
    console.log('如未生成示例数据，请先运行：pnpm exec tsx examples/scripts/gen-demo-data.ts\n');

    const markdownPath = resolve(__dirname, 'demo-data/docs/local-images.md');

    const mockAdapter = {
        async upload(localPath: string, remotePath: string) {
            console.log(`  [模拟上传] ${localPath} -> ${remotePath}`);
            return {
                name: remotePath,
                url: `https://cdn.example.com/${remotePath}`,
            };
        },
    };

    // 高级字段模板配置
    const config = new ConfigBuilder()
        .storage(mockAdapter, {
            prefix: 'uploads/blog/',
            namingPattern: '{date}_{md5_8}{ext}',
        })
        .replace({
            fields: {
                src: '{cloudSrc}?optimize=true&quality=80',
                alt: '{author} - 来自我的博客',
                title: '博客图片',
            },
            context: {
                author: '张三',
                site: 'myblog.com',
            },
        })
        .events(
            (event) => {
                if (event.type === 'upload:complete') {
                    console.log(`  ✓ 上传成功: ${event.data?.localPath}`);
                    console.log(`    URL: ${event.data?.cloudUrl}`);
                } else if (event.type === 'upload:error') {
                    console.error(`  ✗ 上传失败: ${event.data?.localPath}`);
                    console.error(`    错误: ${event.data?.error?.message}`);
                } else if (event.type === 'replace:complete') {
                    console.log('  ✓ 替换完成');
                }
            },
            (level, message, meta) => {
                if (level === 'error' || level === 'warn') {
                    console.log(`  [${level.toUpperCase()}] ${message}`, meta || '');
                }
            }
        )
        .build();

    const result = await uploadLocalImageInMarkdown(markdownPath, config);

    console.log('\n=== 上传完成 ===');
    console.log(`成功上传：${result.uploaded} 个图片`);
    console.log(`替换引用：${result.replaced} 处`);
    console.log(`删除本地：${result.deleted} 个文件`);

    // 输出详细结果
    console.log(`\n${JSON.stringify(result, null, 2)}`);
}

try {
    await main();
} catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ 错误：', message);
    process.exit(1);
}
