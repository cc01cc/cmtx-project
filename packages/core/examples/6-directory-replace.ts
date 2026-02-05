/**
 * 示例 6: 目录级别图片替换功能演示
 * 运行：pnpm exec tsx examples/6-directory-replace.ts
 *
 * 如未生成示例数据，请先运行：pnpm exec tsx examples/scripts/gen-demo-data.ts
 *
 * 这个示例展示了新添加的 replaceImagesInDirectory 函数的使用，
 * 该函数提供了比手动组合 filter + replace 更简洁的 API。
 */

import { replaceImagesInDirectory } from '../src';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
    console.log('如未生成示例数据，请先运行：pnpm exec tsx examples/scripts/gen-demo-data.ts\n');

    const docsDir = resolve(__dirname, 'demo-data/docs');
    const outputDir = resolve(__dirname, 'demo-data/output');

    console.log('=== replaceImagesInDirectory 功能演示 ===\n');

    // 场景 1: 基本使用 - 替换所有 PNG 文件为 WEBP
    console.log('场景 1: 基本使用 - 批量替换图片格式');
    const result1 = await replaceImagesInDirectory(docsDir, [{ field: 'src', pattern: /\.png$/, newValue: '.webp' }]);

    console.log(`处理文件数：${result1.totalFiles}`);
    console.log(`成功文件数：${result1.successfulFiles}`);
    console.log(`总替换次数：${result1.totalReplacements}`);
    console.log(`失败文件数：${result1.failedFiles}\n`);

    // 场景 2: 使用 glob 模式和忽略规则
    console.log('场景 2: 指定文件模式和忽略规则');
    const result2 = await replaceImagesInDirectory(
        docsDir,
        [{ field: 'src', pattern: 'https://cdn.example.com/', newValue: 'https://new-cdn.com/' }],
        {
            patterns: ['**/*.md'],
            ignore: ['**/multilingual.md', '**/comprehensive-paths.md'],
        }
    );

    console.log(`处理文件数：${result2.totalFiles}`);
    console.log(`成功文件数：${result2.successfulFiles}`);
    console.log(`总替换次数：${result2.totalReplacements}\n`);

    // 场景 3: 同时替换多个字段
    console.log('场景 3: 同时替换 src 和 alt 字段');
    const result3 = await replaceImagesInDirectory(docsDir, [
        { field: 'src', pattern: '.webp', newValue: '.avif' },
        { field: 'alt', pattern: /Image|图片/g, newValue: '媒体文件' },
    ]);

    console.log(`处理文件数：${result3.totalFiles}`);
    console.log(`成功文件数：${result3.successfulFiles}`);
    console.log(`总替换次数：${result3.totalReplacements}\n`);

    // 场景 4: 使用正则表达式模式
    console.log('场景 4: 正则表达式高级匹配');
    const result4 = await replaceImagesInDirectory(docsDir, [
        { field: 'src', pattern: /(https?:\/\/[^\/]+\/)/, newValue: '$1assets/' },
    ]);

    console.log(`处理文件数：${result4.totalFiles}`);
    console.log(`成功文件数：${result4.successfulFiles}`);
    console.log(`总替换次数：${result4.totalReplacements}\n`);

    // 场景 5: 带日志回调的详细模式
    console.log('场景 5: 带详细日志的执行');
    const logs: string[] = [];
    const logger = (level: string, message: string, meta?: any) => {
        logs.push(`[${level.toUpperCase()}] ${message}`);
        if (meta) {
            logs.push(`  Meta: ${JSON.stringify(meta)}`);
        }
    };

    const result5 = await replaceImagesInDirectory(
        docsDir,
        [{ field: 'title', pattern: 'Image Title', newValue: 'Updated Image Title' }],
        undefined,
        logger
    );

    console.log(`处理文件数：${result5.totalFiles}`);
    console.log(`成功文件数：${result5.successfulFiles}`);
    console.log(`日志条数：${logs.length}\n`);

    // 输出详细结果
    console.log('=== 详细执行结果 ===');
    console.log(
        JSON.stringify(
            {
                basicReplace: {
                    totalFiles: result1.totalFiles,
                    successfulFiles: result1.successfulFiles,
                    totalReplacements: result1.totalReplacements,
                    failedFiles: result1.failedFiles,
                },
                patternIgnore: {
                    totalFiles: result2.totalFiles,
                    successfulFiles: result2.successfulFiles,
                    totalReplacements: result2.totalReplacements,
                },
                multiField: {
                    totalFiles: result3.totalFiles,
                    successfulFiles: result3.successfulFiles,
                    totalReplacements: result3.totalReplacements,
                },
                regexReplace: {
                    totalFiles: result4.totalFiles,
                    successfulFiles: result4.successfulFiles,
                    totalReplacements: result4.totalReplacements,
                },
                withLogging: {
                    totalFiles: result5.totalFiles,
                    successfulFiles: result5.successfulFiles,
                    logEntries: logs.length,
                    sampleLogs: logs.slice(0, 3),
                },
                summary: {
                    totalProcessedFiles:
                        result1.totalFiles +
                        result2.totalFiles +
                        result3.totalFiles +
                        result4.totalFiles +
                        result5.totalFiles,
                    totalSuccessfulOperations: [result1, result2, result3, result4, result5].filter(
                        (r) => r.successfulFiles > 0
                    ).length,
                    totalReplacementsMade:
                        result1.totalReplacements +
                        result2.totalReplacements +
                        result3.totalReplacements +
                        result4.totalReplacements +
                        result5.totalReplacements,
                },
            },
            null,
            2
        )
    );

    console.log('\n✅ 目录替换功能演示完成！');
    console.log('💡 replaceImagesInDirectory 提供了简洁的批量替换 API，');
    console.log('   支持 glob 模式、忽略规则、多字段替换和详细日志。');
}

await main();
