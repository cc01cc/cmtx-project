/**
 * 配置文件示例
 *
 * 演示如何使用 YAML 配置文件进行传输。
 */

import { loadConfigFromFile } from '@cmtx/asset/config';
import { createTransferManager } from '@cmtx/asset/transfer';
import { AliOSSAdapter } from '@cmtx/storage/adapters/ali-oss';
import OSS from 'ali-oss';

async function main() {
    // 1. 从文件加载配置
    const rawConfig = await loadConfigFromFile('./transfer-config.yaml');

    // 2. 创建 OSS 客户端（配置文件中不包含敏感信息）
    const sourceClient = new OSS({
        region: process.env.SOURCE_REGION || 'oss-cn-hangzhou',
        accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID!,
        accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET!,
        bucket: (rawConfig.source as any).config?.bucket || 'source-bucket',
    });

    const targetClient = new OSS({
        region: process.env.TARGET_REGION || 'oss-cn-beijing',
        accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID!,
        accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET!,
        bucket: (rawConfig.target as any).config?.bucket || 'target-bucket',
    });

    // 3. 构建完整配置
    const config = {
        source: {
            ...rawConfig.source,
            adapter: new AliOSSAdapter(sourceClient),
        },
        target: {
            ...rawConfig.target,
            adapter: new AliOSSAdapter(targetClient),
        },
        options: rawConfig.options,
    };

    // 4. 创建传输管理器并执行
    const manager = createTransferManager(config);
    const result = await manager.transferMarkdown('./article.md');

    console.log('\n传输完成！');
    console.log(`总文件数: ${result.total}`);
    console.log(`成功: ${result.success}`);
    console.log(`失败: ${result.failed}`);
    console.log(`跳过: ${result.skipped}`);
}

main().catch(console.error);

/**
 * transfer-config.yaml 示例:
 *
 * 注意：customDomain 支持以下两种格式，系统会自动处理协议名：
 *   1. 纯域名格式（推荐）: private.example.com
 *   2. 完整 URL 格式: https://private.example.com
 *
 * 源存储的 customDomain 用于匹配 Markdown 中的图片 URL，系统会自动移除协议名进行匹配。
 * 目标存储的 customDomain 用于生成新的图片 URL，系统会自动添加 https:// 前缀。
 *
 * source:
 *   customDomain: private.example.com
 *   config:
 *     bucket: source-bucket
 * target:
 *   customDomain: cdn.example.com
 *   prefix: images/
 *   namingStrategy: preserve
 *   overwrite: false
 *   config:
 *     bucket: target-bucket
 * options:
 *   concurrency: 5
 *   tempDir: /tmp/cmtx-transfer
 *   filter:
 *     extensions:
 *       - .jpg
 *       - .png
 *       - .gif
 *     maxSize: 10485760  # 10MB
 */
