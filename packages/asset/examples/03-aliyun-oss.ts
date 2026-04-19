/**
 * 阿里云 OSS 集成示例
 *
 * 演示如何配置和使用阿里云 OSS 适配器
 *
 * 使用前请先安装 ali-oss:
 * ```bash
 * pnpm add ali-oss
 * ```
 *
 * 运行命令：
 *   pnpm exec tsx examples/scripts/gen-demo-data.ts
 *   pnpm exec tsx examples/03-aliyun-oss.ts
 *
 * 并设置环境变量：
 * - ALIYUN_OSS_REGION: OSS 区域
 * - ALIYUN_OSS_ACCESS_KEY_ID: AccessKey ID
 * - ALIYUN_OSS_ACCESS_KEY_SECRET: AccessKey Secret
 * - ALIYUN_OSS_BUCKET: Bucket 名称
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

// 加载环境变量
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '.env') });

import OSS from 'ali-oss';
import { AliOSSAdapter } from '../src/adapters/ali-oss.js';
import { ConfigBuilder, uploadLocalImageInMarkdown } from '../src/index.js';

async function main() {
    console.log('=== 阿里云 OSS 集成示例 ===\n');

    // 模拟 OSS 配置（实际使用时从环境变量读取）
    const ossConfig = {
        region: process.env.ALIYUN_OSS_REGION || 'oss-cn-hangzhou',
        accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID,
        accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET,
        bucket: process.env.ALIYUN_OSS_BUCKET,
    };

    // 验证配置
    if (!ossConfig.accessKeyId || !ossConfig.accessKeySecret || !ossConfig.bucket) {
        console.warn('⚠️  缺少 OSS 配置，使用模拟适配器演示');
        console.log('请设置以下环境变量以使用真实的 OSS 服务：');
        console.log('  - ALIYUN_OSS_ACCESS_KEY_ID');
        console.log('  - ALIYUN_OSS_ACCESS_KEY_SECRET');
        console.log('  - ALIYUN_OSS_BUCKET\n');
    }

    const markdownPath = resolve(__dirname, 'demo-data/docs/local-images.md');

    // 根据配置选择适配器
    const adapter =
        ossConfig.accessKeyId && ossConfig.accessKeySecret && ossConfig.bucket
            ? createRealOSSAdapter(
                  ossConfig as {
                      region: string;
                      accessKeyId: string;
                      accessKeySecret: string;
                      bucket: string;
                  }
              )
            : createMockAdapter();

    // 构建配置
    const config = new ConfigBuilder()
        .storage(adapter, {
            prefix: 'uploads/',
            namingPattern: '{date}_{md5_8}{ext}',
        })
        .replace({
            fields: {
                src: '{cloudSrc}?x-oss-process=image/quality,q_80',
                alt: '{originalAlt} - 来自阿里云 OSS',
            },
        })
        .events(
            (event) => {
                if (event.type === 'upload:complete') {
                    console.log(`⬆️  上传成功：${event.data?.localPath}`);
                    console.log(`✓ URL: ${event.data?.cloudUrl}\n`);
                } else if (event.type === 'upload:error') {
                    console.error(`❌ 上传失败：${event.data?.localPath}`);
                    console.error(`   错误：${event.data?.error?.message}\n`);
                }
            },
            (level, message, meta) => {
                if (level === 'error' || level === 'warn') {
                    console.log(`[${level.toUpperCase()}] ${message}`, meta || '');
                }
            }
        )
        .build();

    const result = await uploadLocalImageInMarkdown(markdownPath, config);

    console.log(`\n✅ 完成！成功上传 ${result.uploaded} 个文件`);
    console.log(`替换引用：${result.replaced} 处`);
    console.log(`删除本地：${result.deleted} 个文件`);

    console.log(`\n${JSON.stringify(result, null, 2)}`);
}

// 模拟适配器（用于演示）
function createMockAdapter() {
    return {
        async upload(localPath: string, remotePath: string) {
            console.log(`  [模拟 OSS 上传] ${localPath} -> ${remotePath}`);
            return {
                name: remotePath,
                url: `https://${process.env.ALIYUN_OSS_BUCKET || 'example-bucket'}.${process.env.ALIYUN_OSS_REGION || 'oss-cn-hangzhou'}.aliyuncs.com/${remotePath}`,
            };
        },
    };
}

// 真实 OSS 适配器（使用 AliOSSAdapter）
function createRealOSSAdapter(ossConfig: {
    region: string;
    accessKeyId: string;
    accessKeySecret: string;
    bucket: string;
}) {
    console.log('使用真实 OSS 适配器配置...');

    const client = new OSS({
        region: ossConfig.region,
        accessKeyId: ossConfig.accessKeyId,
        accessKeySecret: ossConfig.accessKeySecret,
        bucket: ossConfig.bucket,
    });

    return new AliOSSAdapter(client);
}

try {
    await main();
} catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('\n❌ 错误：', message);
    process.exit(1);
}
