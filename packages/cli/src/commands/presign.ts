/**
 * presign 命令 - 生成预签名 URL
 *
 * 用法：
 *   cmtx presign --url <url> [options]     # 单个 URL
 *   cmtx presign <file> [options]          # Markdown 文件中的所有图片
 *
 * 示例：
 *   cmtx presign --url "https://bucket.oss-cn-hangzhou.aliyuncs.com/path/to/image.png"
 *   cmtx presign ./article.md --expire 3600
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { filterImagesInText, type WebImageMatch } from '@cmtx/core';
import type { CloudCredentials, IStorageAdapter } from '@cmtx/storage';
import { createAdapter } from '@cmtx/storage/adapters/factory';
import type { Argv, CommandModule } from 'yargs';
import { type CLIConfig, ConfigLoader } from '../config/config-loader.js';
import { formatError, formatInfo, formatSuccess, formatWarning } from '../utils/formatter.js';
import { createLogger } from '../utils/logger.js';

export const command = 'presign [input]';
export const describe = '生成预签名 URL';

interface PresignCommandOptions {
    input?: string;
    url?: string;
    expire?: number;
    provider?: 'aliyun-oss' | 'tencent-cos';
    config?: string;
    verbose?: boolean;
}

export function builder(yargs: Argv): Argv {
    return yargs
        .positional('input', {
            description: 'Markdown 文件路径',
            type: 'string',
        })
        .option('url', {
            alias: 'u',
            description: '单个图片 URL',
            type: 'string',
        })
        .option('expire', {
            alias: 'e',
            description: '过期时间（秒）',
            type: 'number',
            default: 600,
        })
        .option('provider', {
            alias: 'p',
            description: '云存储提供商',
            type: 'string',
            choices: ['aliyun-oss', 'tencent-cos'] as const,
            default: 'aliyun-oss',
        })
        .option('config', {
            alias: 'c',
            description: '配置文件路径',
            type: 'string',
        })
        .option('verbose', {
            alias: 'v',
            description: '详细输出',
            type: 'boolean',
            default: false,
        })
        .conflicts('input', 'url')
        .check((argv) => {
            if (!argv.input && !argv.url) {
                throw new Error('必须提供 input 文件路径或 --url 参数');
            }
            return true;
        });
}

/**
 * 从环境变量或配置创建凭证
 */
function createCredentials(
    provider: 'aliyun-oss' | 'tencent-cos',
    config: Record<string, unknown> = {}
): CloudCredentials {
    switch (provider) {
        case 'aliyun-oss': {
            const accessKeyId =
                (config.accessKeyId as string) || process.env.ALIYUN_OSS_ACCESS_KEY_ID;
            const accessKeySecret =
                (config.accessKeySecret as string) || process.env.ALIYUN_OSS_ACCESS_KEY_SECRET;
            const region =
                (config.region as string) || process.env.ALIYUN_OSS_REGION || 'oss-cn-hangzhou';
            const bucket = (config.bucket as string) || process.env.ALIYUN_OSS_BUCKET;

            if (!accessKeyId || !accessKeySecret || !bucket) {
                throw new Error(
                    '缺少阿里云 OSS 凭证，请设置以下环境变量或配置：\n' +
                        '  - ALIYUN_OSS_ACCESS_KEY_ID\n' +
                        '  - ALIYUN_OSS_ACCESS_KEY_SECRET\n' +
                        '  - ALIYUN_OSS_BUCKET\n' +
                        '  - ALIYUN_OSS_REGION (可选，默认 oss-cn-hangzhou)'
                );
            }

            return {
                provider: 'aliyun-oss',
                accessKeyId,
                accessKeySecret,
                region,
                bucket,
            };
        }

        case 'tencent-cos': {
            const secretId = (config.secretId as string) || process.env.TENCENT_COS_SECRET_ID;
            const secretKey = (config.secretKey as string) || process.env.TENCENT_COS_SECRET_KEY;
            const region =
                (config.region as string) || process.env.TENCENT_COS_REGION || 'ap-guangzhou';
            const bucket = (config.bucket as string) || process.env.TENCENT_COS_BUCKET;

            if (!secretId || !secretKey || !bucket) {
                throw new Error(
                    '缺少腾讯云 COS 凭证，请设置以下环境变量或配置：\n' +
                        '  - TENCENT_COS_SECRET_ID\n' +
                        '  - TENCENT_COS_SECRET_KEY\n' +
                        '  - TENCENT_COS_BUCKET (格式: bucketname-appid)\n' +
                        '  - TENCENT_COS_REGION (可选，默认 ap-guangzhou)'
                );
            }

            return {
                provider: 'tencent-cos',
                secretId,
                secretKey,
                region,
                bucket,
            };
        }

        default:
            throw new Error(`不支持的云存储提供商: ${provider}`);
    }
}

/**
 * 从 URL 提取远程路径
 */
function extractRemotePath(url: string): string {
    try {
        const urlObj = new URL(url);
        let path = urlObj.pathname;
        if (path.startsWith('/')) {
            path = path.substring(1);
        }
        return path;
    } catch {
        return url;
    }
}

/**
 * 从 URL 提取域名
 */
function extractDomain(url: string): string {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    } catch {
        return '';
    }
}

/**
 * 生成默认域名
 */
function generateDefaultDomain(
    provider: 'aliyun-oss' | 'tencent-cos',
    bucket: string,
    region: string
): string {
    switch (provider) {
        case 'aliyun-oss':
            return `${bucket}.${region}.aliyuncs.com`;
        case 'tencent-cos':
            return `${bucket}.cos.${region}.myqcloud.com`;
        default:
            return '';
    }
}

export async function handler(argv: PresignCommandOptions): Promise<void> {
    const logger = createLogger(argv.verbose);
    const configLoader = new ConfigLoader();

    try {
        // 加载配置
        let cliConfig: CLIConfig | undefined;
        if (argv.config) {
            logger('info', `加载配置文件：${argv.config}`);
            cliConfig = await configLoader.loadFromFile(argv.config);
        } else {
            const defaultConfigPath = await configLoader.findDefaultConfig();
            if (defaultConfigPath) {
                logger('info', `使用默认配置文件：${defaultConfigPath}`);
                cliConfig = await configLoader.loadFromFile(defaultConfigPath);
            }
        }

        // 获取云存储提供商
        const provider =
            (cliConfig?.storage.provider as CloudCredentials['provider']) ||
            argv.provider ||
            'aliyun-oss';

        // 创建凭证和适配器
        const credentials = createCredentials(provider, cliConfig?.storage.config || {});
        logger('info', `使用云存储: ${provider}`);
        logger('info', `Bucket: ${credentials.bucket}`);
        logger('info', `Region: ${credentials.region}`);

        const adapter = await createAdapter(credentials);

        // 检查适配器是否支持 getSignedUrl
        if (!adapter.getSignedUrl) {
            console.error(formatError(`适配器不支持预签名 URL 功能`));
            process.exit(1);
        }

        // 生成默认域名
        const defaultDomain = generateDefaultDomain(
            provider,
            credentials.bucket,
            credentials.region
        );
        logger('info', `默认域名: ${defaultDomain}`);

        const expire = argv.expire || 600;

        // 处理单个 URL
        if (argv.url) {
            await handleSingleUrl(argv.url, adapter, expire, logger, defaultDomain);
            return;
        }

        // 处理 Markdown 文件
        if (argv.input) {
            await handleMarkdownFile(argv.input, adapter, expire, logger, defaultDomain);
            return;
        }
    } catch (error) {
        const message = error instanceof Error ? error : new Error(String(error));
        console.error(formatError(message));
        process.exit(1);
    }
}

async function handleSingleUrl(
    url: string,
    adapter: IStorageAdapter,
    expire: number,
    logger: ReturnType<typeof createLogger>,
    defaultDomain: string
): Promise<void> {
    logger('info', `处理 URL: ${url}`);

    const domain = extractDomain(url);
    logger('info', `域名: ${domain}`);

    // 检查是否匹配默认域名
    if (domain !== defaultDomain && !domain.includes(defaultDomain.split('.')[0] || '')) {
        console.log(
            formatWarning(`警告: URL 域名 (${domain}) 与配置的默认域名 (${defaultDomain}) 不匹配`)
        );
    }

    const remotePath = extractRemotePath(url);
    logger('info', `远程路径: ${remotePath}`);

    try {
        const signedUrl = await adapter.getSignedUrl?.(remotePath, expire, {
            disposition: 'inline',
        });

        console.log('');
        console.log(formatInfo('原始 URL:'));
        console.log(`  ${url}`);
        console.log('');
        console.log(formatSuccess('预签名 URL:'));
        console.log(`  ${signedUrl}`);
        console.log('');
        console.log(formatInfo(`过期时间: ${expire} 秒`));
    } catch (error) {
        console.error(
            formatError(
                `生成预签名 URL 失败: ${error instanceof Error ? error.message : String(error)}`
            )
        );
        process.exit(1);
    }
}

async function handleMarkdownFile(
    inputPath: string,
    adapter: IStorageAdapter,
    expire: number,
    logger: ReturnType<typeof createLogger>,
    defaultDomain: string
): Promise<void> {
    const absolutePath = resolve(inputPath);
    logger('info', `处理文件: ${absolutePath}`);

    const content = await readFile(absolutePath, 'utf-8');
    const images = filterImagesInText(content, { mode: 'sourceType', value: 'web' });

    const webImages = images.filter((img): img is WebImageMatch => img.type === 'web');

    if (webImages.length === 0) {
        console.log(formatWarning('未找到远程图片'));
        return;
    }

    logger('info', `找到 ${webImages.length} 个远程图片`);

    let matched = 0;
    let processed = 0;
    let failed = 0;

    console.log('');
    console.log(formatInfo('开始处理图片...'));
    console.log('');

    for (const image of webImages) {
        const domain = extractDomain(image.src);

        // 检查是否匹配默认域名
        if (domain !== defaultDomain && !domain.includes(defaultDomain.split('.')[0] || '')) {
            logger('debug', `跳过不匹配的域名: ${domain}`);
            continue;
        }

        matched++;
        const remotePath = extractRemotePath(image.src);

        try {
            const signedUrl = await adapter.getSignedUrl?.(remotePath, expire, {
                disposition: 'inline',
            });
            processed++;

            console.log(formatSuccess(`[${processed}/${webImages.length}] 成功`));
            console.log(`  原始: ${image.src}`);
            console.log(`  签名: ${signedUrl}`);
            console.log('');
        } catch (error) {
            failed++;
            console.log(formatError(`[${matched}/${webImages.length}] 失败`));
            console.log(`  URL: ${image.src}`);
            console.log(`  错误: ${error instanceof Error ? error.message : String(error)}`);
            console.log('');
        }
    }

    // 输出统计
    console.log(formatInfo('处理完成:'));
    console.log(`  总图片数: ${webImages.length}`);
    console.log(`  匹配域名: ${matched}`);
    console.log(`  ${formatSuccess('成功')}: ${processed}`);
    if (failed > 0) {
        console.log(`  ${formatError('失败')}: ${failed}`);
    }

    if (matched === 0) {
        console.log('');
        console.log(formatWarning(`没有图片匹配域名: ${defaultDomain}`));
    }

    process.exit(failed > 0 ? 1 : 0);
}

const presignModule: CommandModule = {
    command,
    describe,
    builder,
    handler: (args) => handler(args as unknown as PresignCommandOptions),
};

export default presignModule;
