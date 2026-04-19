/**
 * upload 命令 - 上传 Markdown 文件中的本地图片
 *
 * 用法：cmtx upload <filePath> [options]
 * 示例：cmtx upload ./article.md --provider aliyun-oss --prefix blog/images
 */

import type { DeleteOptions } from '@cmtx/asset/upload';
import { ConfigBuilder, uploadLocalImageInMarkdown } from '@cmtx/asset/upload';
import type { CloudCredentials } from '@cmtx/storage';
import { createAdapter } from '@cmtx/storage/adapters/factory';
import type { Argv, CommandModule } from 'yargs';
import { type CLIConfig, ConfigLoader } from '../config/config-loader.js';
import type { UploadCommandOptions } from '../types/cli.js';
import { formatError, formatInfo } from '../utils/formatter.js';
import { createLogger } from '../utils/logger.js';

export const command = 'upload <filePath>';
export const description = '上传 Markdown 文件中的本地图片到对象存储并替换引用';

export function builder(yargs: Argv): Argv {
    return yargs
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
            alias: 'p',
            description: '云存储提供商 (aliyun-oss | tencent-cos)',
            type: 'string',
            choices: ['aliyun-oss', 'tencent-cos'],
            default: 'aliyun-oss',
        })
        .option('prefix', {
            description: '远程路径前缀，例如 blog/images',
            type: 'string',
        })
        .option('naming-pattern', {
            alias: 'n',
            description: '命名模板，例如 {date}_{md5_8}{ext}',
            type: 'string',
            default: '{name}_{hash}{ext}',
        })
        .option('enable-delete', {
            description: '启用本地文件删除',
            type: 'boolean',
            default: false,
        })
        .option('delete-strategy', {
            description: '删除策略 (trash|move|hard-delete)',
            type: 'string',
            default: 'trash',
        })
        .option('trash-dir', {
            description: '回收站目录（当 strategy=move 时使用）',
            type: 'string',
        })
        .option('root-path', {
            description: '安全删除根路径',
            type: 'string',
        })
        .option('verbose', {
            alias: 'v',
            description: '详细输出',
            type: 'boolean',
            default: false,
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

export async function handler(argv: UploadCommandOptions): Promise<void> {
    const logger = createLogger(argv.verbose);
    const configLoader = new ConfigLoader();

    try {
        // 标准化文件路径为绝对路径
        const absolutePath =
            argv.filePath.startsWith('/') || argv.filePath.includes(':\\')
                ? argv.filePath
                : `${process.cwd()}/${argv.filePath}`;

        logger('info', `处理文件：${absolutePath}`);

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
        const adapter = await createAdapter(credentials);

        // 构建配置
        const configBuilder = new ConfigBuilder().storage(adapter, {
            prefix: cliConfig?.storage.prefix || argv.prefix,
            namingPattern: cliConfig?.storage.namingPattern || argv.namingPattern,
        });

        // 配置替换选项
        if (cliConfig?.replace?.enabled !== false) {
            const fields = cliConfig?.replace?.fields || {
                src: '{cloudSrc}',
                alt: '{originalAlt}',
            };
            configBuilder.fieldTemplates(fields);
        }

        // 配置删除选项
        const enableDelete = cliConfig?.delete?.enabled ?? argv.enableDelete;
        if (enableDelete) {
            const deleteOptions: DeleteOptions = {
                strategy: cliConfig?.delete?.strategy || argv.deleteStrategy || 'trash',
                trashDir: cliConfig?.delete?.trashDir || argv.trashDir,
            };
            configBuilder.delete(deleteOptions);
        }

        // 添加日志回调
        configBuilder.events(undefined, (level, message, meta) => {
            if (level === 'error' || level === 'warn' || argv.verbose) {
                console.log(`[${level.toUpperCase()}] ${message}`);
                if (meta) {
                    if (meta instanceof Error) {
                        console.log(`[${level.toUpperCase()}] Error: ${meta.message}`);
                        if (meta.stack && argv.verbose) {
                            console.log(`[${level.toUpperCase()}] Stack: ${meta.stack}`);
                        }
                    } else if (typeof meta === 'object' && 'error' in meta) {
                        const err = meta.error;
                        if (err instanceof Error) {
                            console.log(`[${level.toUpperCase()}] Error: ${err.message}`);
                            if (err.stack && argv.verbose) {
                                console.log(`[${level.toUpperCase()}] Stack: ${err.stack}`);
                            }
                        } else {
                            console.log(
                                `[${level.toUpperCase()}] ${JSON.stringify(meta, null, 2)}`
                            );
                        }
                    } else {
                        console.log(`[${level.toUpperCase()}] ${JSON.stringify(meta, null, 2)}`);
                    }
                }
            }
        });

        const config = configBuilder.build();

        // 执行上传（CLI 默认写入文件）
        logger('info', '开始上传...');
        const result = await uploadLocalImageInMarkdown(absolutePath, config, { writeFile: true });

        // 输出结果
        console.log(
            formatInfo(
                `上传完成！\n  上传图片：${result.uploaded}\n  替换引用：${result.replaced}\n  删除本地：${result.deleted}`
            )
        );
    } catch (error) {
        const message = error instanceof Error ? error : new Error(String(error));
        console.error(formatError(message));
        process.exit(1);
    }
}

// 默认导出为 yargs CommandModule
const uploadModule: CommandModule = {
    command,
    describe: description,
    builder,
    handler: (args) => handler(args as unknown as UploadCommandOptions),
};

export default uploadModule;
