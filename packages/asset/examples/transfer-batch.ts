/**
 * 批量传输示例
 *
 * 演示如何批量传输多个 Markdown 文件。
 */

import path from 'node:path';
import { createTransferManager } from '@cmtx/asset/transfer';
import { AliOSSAdapter } from '@cmtx/storage/adapters/ali-oss';
import OSS from 'ali-oss';
import fg from 'fast-glob';

async function main() {
    // 1. 配置存储
    const sourceClient = new OSS({
        region: 'oss-cn-hangzhou',
        accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID!,
        accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET!,
        bucket: 'source-bucket',
    });

    const targetClient = new OSS({
        region: 'oss-cn-beijing',
        accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID!,
        accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET!,
        bucket: 'target-bucket',
    });

    // 2. 创建配置
    const config = {
        source: {
            adapter: new AliOSSAdapter(sourceClient),
            customDomain: 'https://source.example.com',
        },
        target: {
            adapter: new AliOSSAdapter(targetClient),
            customDomain: 'https://cdn.example.com',
            prefix: 'images/',
            namingStrategy: 'preserve',
            overwrite: false,
        },
        options: {
            concurrency: 5,
            onProgress: (progress) => {
                process.stdout.write(
                    `\r[${progress.current}/${progress.total}] ${progress.fileName}`
                );
            },
        },
    };

    // 3. 查找所有 Markdown 文件
    const files = await fg(['**/*.md', '**/*.markdown'], {
        cwd: './docs',
        absolute: true,
    });

    console.log(`找到 ${files.length} 个 Markdown 文件\n`);

    // 4. 创建传输管理器
    const manager = createTransferManager(config);

    // 5. 批量传输
    const results = new Map<string, ReturnType<typeof manager.transferMarkdown>>();

    for (const file of files) {
        console.log(`处理: ${path.relative('./docs', file)}`);
        try {
            const result = await manager.transferMarkdown(file);
            results.set(file, result);

            if (result.success > 0) {
                console.log(`  ✓ 传输了 ${result.success} 个文件`);
            }
            if (result.failed > 0) {
                console.log(`  ✗ 失败了 ${result.failed} 个文件`);
            }
            if (result.skipped > 0) {
                console.log(`  - 跳过了 ${result.skipped} 个文件`);
            }
        } catch (err) {
            console.error(`  ✗ 错误: ${err}`);
        }
    }

    // 6. 汇总结果
    let totalSuccess = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    for (const result of results.values()) {
        totalSuccess += result.success;
        totalFailed += result.failed;
        totalSkipped += result.skipped;
    }

    console.log('\n批量传输完成！');
    console.log(`成功: ${totalSuccess}`);
    console.log(`失败: ${totalFailed}`);
    console.log(`跳过: ${totalSkipped}`);
}

main().catch(console.error);
