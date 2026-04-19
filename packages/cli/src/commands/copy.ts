/**
 * copy 命令 - 复制 Markdown 中的远程图片到目标存储
 *
 * 用法：cmtx copy <filePath> [options]
 * 示例：cmtx copy ./article.md --config copy-config.yaml
 *
 * 配置优先级：
 * 命令行参数 > 配置文件中的环境变量模板
 */

import { loadConfigFromFile } from '@cmtx/asset/config';
import type {
    CloudCredentials,
    InternalTransferConfig,
    TransferConfig,
} from '@cmtx/asset/transfer';
import { createTransferManager } from '@cmtx/asset/transfer';
import { createAdapter } from '@cmtx/storage/adapters/factory';
import type { Argv, CommandModule } from 'yargs';
import type { CopyCommandOptions } from '../types/cli.js';
import { formatError } from '../utils/formatter.js';
import { createLogger } from '../utils/logger.js';

export const command = 'copy <filePath>';
export const description = '复制 Markdown 文件中的远程图片到目标存储（源文件保留）';

export function builder(yargs: Argv): Argv {
    return (
        yargs
            .positional('filePath', {
                description: 'Markdown 文件路径',
                type: 'string',
            })
            .option('config', {
                alias: 'c',
                description: '配置文件路径',
                type: 'string',
            })
            .option('provider', {
                description: '云存储提供商 (aliyun-oss | tencent-cos)',
                type: 'string',
                choices: ['aliyun-oss', 'tencent-cos'],
                default: 'aliyun-oss',
            })
            // 源存储凭证
            .option('source-access-key-id', {
                description: '源存储访问密钥 ID（阿里云）',
                type: 'string',
            })
            .option('source-access-key-secret', {
                description: '源存储访问密钥 Secret（阿里云）',
                type: 'string',
            })
            .option('source-secret-id', {
                description: '源存储密钥 ID（腾讯云）',
                type: 'string',
            })
            .option('source-secret-key', {
                description: '源存储密钥 Key（腾讯云）',
                type: 'string',
            })
            .option('source-region', {
                description: '源存储区域',
                type: 'string',
            })
            .option('source-bucket', {
                description: '源存储桶',
                type: 'string',
            })
            // 目标存储凭证
            .option('target-access-key-id', {
                description: '目标存储访问密钥 ID（阿里云）',
                type: 'string',
            })
            .option('target-access-key-secret', {
                description: '目标存储访问密钥 Secret（阿里云）',
                type: 'string',
            })
            .option('target-secret-id', {
                description: '目标存储密钥 ID（腾讯云）',
                type: 'string',
            })
            .option('target-secret-key', {
                description: '目标存储密钥 Key（腾讯云）',
                type: 'string',
            })
            .option('target-region', {
                description: '目标存储区域',
                type: 'string',
            })
            .option('target-bucket', {
                description: '目标存储桶',
                type: 'string',
            })
            // 其他选项
            .option('dry-run', {
                alias: 'd',
                description: '预览模式，不实际执行复制',
                type: 'boolean',
                default: false,
            })
            .option('concurrency', {
                alias: 'n',
                description: '并发数',
                type: 'number',
                default: 5,
            })
            .option('verbose', {
                alias: 'v',
                description: '详细输出',
                type: 'boolean',
                default: false,
            })
            .option('target-domain', {
                description: '目标自定义域名',
                type: 'string',
            })
            .option('prefix', {
                alias: 'p',
                description: '目标路径前缀',
                type: 'string',
            })
            .option('naming-template', {
                alias: 't',
                description: '命名模板',
                type: 'string',
            })
            .option('overwrite', {
                description: '是否覆盖已存在的文件',
                type: 'boolean',
                default: false,
            })
            .option('temp-dir', {
                description: '临时目录路径',
                type: 'string',
            })
            .option('quiet', {
                alias: 'q',
                description: '静默模式',
                type: 'boolean',
                default: false,
            })
            .option('format', {
                alias: 'f',
                description: '输出格式 (json|table|plain)',
                choices: ['json', 'table', 'plain'] as const,
                default: 'table',
            })
    );
}

export async function handler(argv: CopyCommandOptions): Promise<void> {
    const logger = createLogger(argv.verbose, argv.quiet);

    try {
        // 加载配置
        let config: TransferConfig;

        if (argv.config) {
            logger('info', `加载配置文件: ${argv.config}`);
            config = await loadConfigFromFile(argv.config, { verbose: argv.verbose });
        } else {
            config = buildConfigFromEnv(argv);
        }

        // 应用命令行覆盖
        config = applyCommandLineOverrides(config, argv);

        // 预览模式
        if (argv.dryRun) {
            await previewCopy(argv.filePath, config, argv.format, logger);
            return;
        }

        // 执行复制
        await executeCopy(argv.filePath, config, argv.format, logger);
    } catch (error) {
        const message = error instanceof Error ? error : new Error(String(error));
        console.error(formatError(message));
        process.exit(1);
    }
}

/**
 * 从环境变量构建配置
 */
function buildConfigFromEnv(argv: CopyCommandOptions): TransferConfig {
    const provider = (argv.provider as CloudCredentials['provider']) || 'aliyun-oss';

    // 阿里云环境变量
    const sourceAccessKeyId = process.env.SOURCE_ACCESS_KEY_ID;
    const sourceAccessKeySecret = process.env.SOURCE_ACCESS_KEY_SECRET;
    const sourceRegion = process.env.SOURCE_REGION || 'oss-cn-hangzhou';
    const sourceBucket = process.env.SOURCE_BUCKET;

    const targetAccessKeyId = process.env.TARGET_ACCESS_KEY_ID;
    const targetAccessKeySecret = process.env.TARGET_ACCESS_KEY_SECRET;
    const targetRegion = process.env.TARGET_REGION || 'oss-cn-hangzhou';
    const targetBucket = process.env.TARGET_BUCKET;

    // 腾讯云环境变量
    const sourceSecretId = process.env.SOURCE_SECRET_ID;
    const sourceSecretKey = process.env.SOURCE_SECRET_KEY;
    const targetSecretId = process.env.TARGET_SECRET_ID;
    const targetSecretKey = process.env.TARGET_SECRET_KEY;

    if (!sourceBucket && !sourceSecretId) {
        throw new Error('缺少源存储凭证，请设置环境变量');
    }

    if (!targetBucket && !targetSecretId) {
        throw new Error('缺少目标存储凭证，请设置环境变量');
    }

    // 构建凭证
    let sourceCredentials: CloudCredentials;
    let targetCredentials: CloudCredentials;

    if (provider === 'aliyun-oss') {
        if (!sourceAccessKeyId || !sourceAccessKeySecret || !sourceBucket) {
            throw new Error('缺少阿里云 OSS 源存储凭证');
        }
        if (!targetAccessKeyId || !targetAccessKeySecret || !targetBucket) {
            throw new Error('缺少阿里云 OSS 目标存储凭证');
        }
        sourceCredentials = {
            provider: 'aliyun-oss',
            accessKeyId: sourceAccessKeyId,
            accessKeySecret: sourceAccessKeySecret,
            region: sourceRegion,
            bucket: sourceBucket,
        };
        targetCredentials = {
            provider: 'aliyun-oss',
            accessKeyId: targetAccessKeyId,
            accessKeySecret: targetAccessKeySecret,
            region: targetRegion,
            bucket: targetBucket,
        };
    } else {
        if (!sourceSecretId || !sourceSecretKey || !sourceBucket) {
            throw new Error('缺少腾讯云 COS 源存储凭证');
        }
        if (!targetSecretId || !targetSecretKey || !targetBucket) {
            throw new Error('缺少腾讯云 COS 目标存储凭证');
        }
        sourceCredentials = {
            provider: 'tencent-cos',
            secretId: sourceSecretId,
            secretKey: sourceSecretKey,
            region: sourceRegion,
            bucket: sourceBucket,
        };
        targetCredentials = {
            provider: 'tencent-cos',
            secretId: targetSecretId,
            secretKey: targetSecretKey,
            region: targetRegion,
            bucket: targetBucket,
        };
    }

    return {
        source: {
            customDomain: process.env.SOURCE_DOMAIN,
            credentials: sourceCredentials,
        },
        target: {
            customDomain: argv.targetDomain ?? process.env.TARGET_DOMAIN,
            credentials: targetCredentials,
            prefix: argv.prefix,
            overwrite: argv.overwrite,
        },
        options: {
            concurrency: argv.concurrency,
            tempDir: argv.tempDir,
        },
    };
}

/**
 * 应用命令行覆盖
 */
function applyCommandLineOverrides(
    config: TransferConfig,
    argv: CopyCommandOptions
): TransferConfig {
    const result: TransferConfig = {
        source: { ...config.source },
        target: { ...config.target },
        options: { ...config.options },
    };

    // 根据提供商类型覆盖凭证
    if (result.source.credentials.provider === 'aliyun-oss') {
        const creds = { ...result.source.credentials };
        if (argv.sourceAccessKeyId) creds.accessKeyId = argv.sourceAccessKeyId;
        if (argv.sourceAccessKeySecret) creds.accessKeySecret = argv.sourceAccessKeySecret;
        if (argv.sourceRegion) creds.region = argv.sourceRegion;
        if (argv.sourceBucket) creds.bucket = argv.sourceBucket;
        result.source.credentials = creds;
    } else if (result.source.credentials.provider === 'tencent-cos') {
        const creds = { ...result.source.credentials };
        if (argv.sourceSecretId) creds.secretId = argv.sourceSecretId;
        if (argv.sourceSecretKey) creds.secretKey = argv.sourceSecretKey;
        if (argv.sourceRegion) creds.region = argv.sourceRegion;
        if (argv.sourceBucket) creds.bucket = argv.sourceBucket;
        result.source.credentials = creds;
    }

    if (result.target.credentials.provider === 'aliyun-oss') {
        const creds = { ...result.target.credentials };
        if (argv.targetAccessKeyId) creds.accessKeyId = argv.targetAccessKeyId;
        if (argv.targetAccessKeySecret) creds.accessKeySecret = argv.targetAccessKeySecret;
        if (argv.targetRegion) creds.region = argv.targetRegion;
        if (argv.targetBucket) creds.bucket = argv.targetBucket;
        result.target.credentials = creds;
    } else if (result.target.credentials.provider === 'tencent-cos') {
        const creds = { ...result.target.credentials };
        if (argv.targetSecretId) creds.secretId = argv.targetSecretId;
        if (argv.targetSecretKey) creds.secretKey = argv.targetSecretKey;
        if (argv.targetRegion) creds.region = argv.targetRegion;
        if (argv.targetBucket) creds.bucket = argv.targetBucket;
        result.target.credentials = creds;
    }

    if (argv.concurrency) {
        result.options = { ...result.options, concurrency: argv.concurrency };
    }
    if (argv.tempDir) {
        result.options = { ...result.options, tempDir: argv.tempDir };
    }
    if (argv.prefix !== undefined) {
        result.target = { ...result.target, prefix: argv.prefix };
    }
    if (argv.namingTemplate) {
        result.target = { ...result.target, namingTemplate: argv.namingTemplate };
    }
    if (argv.overwrite !== undefined) {
        result.target = { ...result.target, overwrite: argv.overwrite };
    }

    return result;
}

/**
 * 预览复制
 */
async function previewCopy(
    filePath: string,
    config: TransferConfig,
    format: 'json' | 'table' | 'plain',
    _logger: (level: 'debug' | 'info' | 'warn' | 'error', message: string) => void
): Promise<void> {
    const { createUrlParser } = await import('@cmtx/asset/transfer');
    const fs = await import('node:fs');

    const content = await fs.promises.readFile(filePath, 'utf-8');
    const urlParser = createUrlParser({
        sourceDomains: config.source.customDomain ? [config.source.customDomain] : [],
    });

    const parsedUrls = urlParser.parseSourceUrls(content);
    const matchedUrls = parsedUrls.filter((url) => url.isMatch && url.remotePath);

    const preview = matchedUrls.map((url) => ({
        originalUrl: url.originalUrl,
        remotePath: url.remotePath,
        willCopy: true,
    }));

    switch (format) {
        case 'json':
            console.log(JSON.stringify(preview, null, 2));
            break;
        case 'table':
            console.log('\n预览结果：');
            console.log('─'.repeat(80));
            console.log(`找到 ${matchedUrls.length} 个需要复制的图片：\n`);
            matchedUrls.forEach((url, i) => {
                console.log(`${i + 1}. ${url.originalUrl}`);
                console.log(`   -> 远程路径: ${url.remotePath}`);
            });
            console.log('─'.repeat(80));
            break;
        case 'plain':
            matchedUrls.forEach((url) => {
                console.log(`${url.originalUrl} -> ${url.remotePath}`);
            });
            break;
    }
}

/**
 * 执行复制
 */
async function executeCopy(
    filePath: string,
    config: TransferConfig,
    format: 'json' | 'table' | 'plain',
    logger: (level: 'debug' | 'info' | 'warn' | 'error', message: string) => void
): Promise<void> {
    const fs = await import('node:fs');

    // 使用工厂创建适配器
    const sourceAdapter = await createAdapter(config.source.credentials);
    const targetAdapter = await createAdapter(config.target.credentials);

    // 创建适配器包装的配置
    const adapterConfig: InternalTransferConfig = {
        source: {
            customDomain: config.source.customDomain,
            adapter: sourceAdapter,
            useSignedUrl: config.source.useSignedUrl,
            signedUrlExpires: config.source.signedUrlExpires,
        },
        target: {
            customDomain: config.target.customDomain,
            adapter: targetAdapter,
            prefix: config.target.prefix,
            namingTemplate: config.target.namingTemplate,
            namingStrategy: config.target.namingStrategy,
            overwrite: config.target.overwrite,
        },
        options: config.options,
    };

    const manager = createTransferManager(adapterConfig);

    const result = await manager.transferMarkdown(filePath);

    if (result.newContent && result.success > 0) {
        await fs.promises.writeFile(filePath, result.newContent, 'utf-8');
        logger('info', `已更新 Markdown 文件: ${filePath}`);
    }

    switch (format) {
        case 'json':
            console.log(JSON.stringify(result, null, 2));
            break;
        case 'table':
            console.log('\n复制完成！');
            console.log('═'.repeat(80));
            console.log(`总文件数: ${result.total}`);
            console.log(`成功: ${result.success}`);
            console.log(`失败: ${result.failed}`);
            console.log(`跳过: ${result.skipped}`);
            console.log('═'.repeat(80));
            break;
        case 'plain':
            console.log(`复制完成: ${result.success}/${result.total}`);
            if (result.failed > 0) {
                console.log(`失败: ${result.failed}`);
            }
            break;
    }

    if (result.errors.length > 0) {
        console.error('\n错误详情:');
        result.errors.forEach((err) => {
            console.error(`  - ${err.url}: ${err.error}`);
        });
    }

    if (result.failed > 0) {
        process.exit(1);
    }
}

const copyModule: CommandModule = {
    command,
    describe: description,
    builder,
    handler: (args) => handler(args as unknown as CopyCommandOptions),
};

export default copyModule;
