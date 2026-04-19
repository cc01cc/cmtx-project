/**
 * 基础传输示例
 *
 * 演示如何使用 transfer 功能将 Markdown 中的远程图片
 * 从一个 OSS bucket 传输到另一个 bucket。
 */

import { createTransferManager } from '@cmtx/asset/transfer';
import { AliOSSAdapter } from '@cmtx/storage/adapters/ali-oss';
import OSS from 'ali-oss';

async function main() {
    // 1. 配置源存储（私有 bucket）
    const sourceClient = new OSS({
        region: 'oss-cn-hangzhou',
        accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID!,
        accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET!,
        bucket: 'my-private-bucket',
    });

    // 2. 配置目标存储（公开 bucket）
    const targetClient = new OSS({
        region: 'oss-cn-beijing',
        accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID!,
        accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET!,
        bucket: 'my-public-bucket',
    });

    // 3. 创建传输配置
    const config = {
        source: {
            adapter: new AliOSSAdapter(sourceClient),
            customDomain: 'https://private.example.com',
        },
        target: {
            adapter: new AliOSSAdapter(targetClient),
            customDomain: 'https://cdn.example.com',
            prefix: 'blog/images/',
            namingStrategy: 'preserve',
            overwrite: false,
        },
        options: {
            concurrency: 5,
            tempDir: '/tmp/cmtx-transfer',
            onProgress: (progress) => {
                console.log(
                    `[${progress.current}/${progress.total}] ${progress.status}: ${progress.fileName}`
                );
            },
        },
    };

    // 4. 创建传输管理器
    const manager = createTransferManager(config);

    // 5. 执行传输
    const result = await manager.transferMarkdown('./article.md');

    // 6. 输出结果
    console.log('\n传输完成！');
    console.log(`总文件数: ${result.total}`);
    console.log(`成功: ${result.success}`);
    console.log(`失败: ${result.failed}`);
    console.log(`跳过: ${result.skipped}`);

    // 7. 显示失败的文件
    if (result.errors.length > 0) {
        console.log('\n失败的文件:');
        result.errors.forEach((err) => {
            console.log(`  - ${err.url}: ${err.error}`);
        });
    }
}

main().catch(console.error);
