/**
 * 跨账号传输示例
 *
 * 演示如何在不同阿里云账号之间传输图片。
 */

import { createTransferManager, TransferConfigBuilder } from '@cmtx/asset/transfer';
import { AliOSSAdapter } from '@cmtx/storage/adapters/ali-oss';
import OSS from 'ali-oss';

async function main() {
    // 1. 配置源存储（账号 A）
    const sourceClient = new OSS({
        region: 'oss-cn-hangzhou',
        accessKeyId: process.env.SOURCE_ALIYUN_OSS_ACCESS_KEY_ID!,
        accessKeySecret: process.env.SOURCE_ALIYUN_OSS_ACCESS_KEY_SECRET!,
        bucket: 'source-bucket-account-a',
    });

    // 2. 配置目标存储（账号 B）
    const targetClient = new OSS({
        region: 'oss-cn-beijing',
        accessKeyId: process.env.TARGET_ALIYUN_OSS_ACCESS_KEY_ID!,
        accessKeySecret: process.env.TARGET_ALIYUN_OSS_ACCESS_KEY_SECRET!,
        bucket: 'target-bucket-account-b',
    });

    // 3. 使用配置构建器
    const config = new TransferConfigBuilder()
        .source(new AliOSSAdapter(sourceClient), {
            customDomain: 'https://source-account-a.oss-cn-hangzhou.aliyuncs.com',
        })
        .target(new AliOSSAdapter(targetClient), {
            customDomain: 'https://cdn-account-b.example.com',
            prefix: 'migrated/',
            namingStrategy: 'timestamp',
            overwrite: false,
        })
        .options({
            concurrency: 3,
            maxConcurrentDownloads: 2,
            tempDir: '/tmp/cmtx-cross-account',
            filter: {
                extensions: ['.jpg', '.png', '.gif', '.webp'],
                maxSize: 10 * 1024 * 1024, // 10MB
            },
        })
        .build();

    // 4. 创建传输管理器并执行
    const manager = createTransferManager(config);
    const result = await manager.transferMarkdown('./article.md');

    console.log('\n跨账号传输完成！');
    console.log(`总文件数: ${result.total}`);
    console.log(`成功: ${result.success}`);
    console.log(`失败: ${result.failed}`);
    console.log(`跳过: ${result.skipped}`);
}

main().catch(console.error);
