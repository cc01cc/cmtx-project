/* eslint-disable no-console */
/**
 * copy 命令 - 复制 Markdown 中的远程图片到目标存储
 *
 * 用法：cmtx copy <filePath> [options]
 * 示例：cmtx copy ./article.md --config copy-config.yaml
 *
 * 配置优先级：
 * 命令行参数 > 配置文件中的环境变量模板
 */

import type { CmtxConfig } from "@cmtx/asset/config";
import type {
    CloudCredentials,
    InternalTransferConfig,
    TransferConfig,
} from "@cmtx/asset/transfer";
import { createTransferManager } from "@cmtx/asset/transfer";
import type { Logger } from "@cmtx/core";
import { createAdapter } from "@cmtx/storage/adapters/factory";
import type { Argv, CommandModule } from "yargs";
import { ConfigLoader } from "../config/config-loader.js";
import type { CopyCommandOptions } from "../types/cli.js";
import { formatError } from "../utils/formatter.js";
import { createLogger } from "../utils/logger.js";

/**
 * 创建云存储凭证
 */
function createCredentials(
    provider: CloudCredentials["provider"],
    config: Record<string, string>,
): CloudCredentials {
    if (provider === "aliyun-oss") {
        return {
            provider: "aliyun-oss",
            accessKeyId: config.accessKeyId || config.ACCESS_KEY_ID || "",
            accessKeySecret: config.accessKeySecret || config.ACCESS_KEY_SECRET || "",
            region: config.region || config.REGION || "",
            bucket: config.bucket || config.BUCKET || "",
        };
    } else {
        return {
            provider: "tencent-cos",
            secretId: config.secretId || config.SECRET_ID || "",
            secretKey: config.secretKey || config.SECRET_KEY || "",
            region: config.region || config.REGION || "",
            bucket: config.bucket || config.BUCKET || "",
        };
    }
}

export const command = "copy <filePath>";
export const description = "复制 Markdown 文件中的远程图片到目标存储（源文件保留）";

export function builder(yargs: Argv): Argv {
    return (
        yargs
            .positional("filePath", {
                description: "Markdown 文件路径",
                type: "string",
            })
            .option("config", {
                alias: "c",
                description: "配置文件路径",
                type: "string",
            })
            .option("provider", {
                description: "云存储提供商 (aliyun-oss | tencent-cos)",
                type: "string",
                choices: ["aliyun-oss", "tencent-cos"],
                default: "aliyun-oss",
            })
            // 源存储凭证
            .option("source-access-key-id", {
                description: "源存储访问密钥 ID（阿里云）",
                type: "string",
            })
            .option("source-access-key-secret", {
                description: "源存储访问密钥 Secret（阿里云）",
                type: "string",
            })
            .option("source-secret-id", {
                description: "源存储密钥 ID（腾讯云）",
                type: "string",
            })
            .option("source-secret-key", {
                description: "源存储密钥 Key（腾讯云）",
                type: "string",
            })
            .option("source-region", {
                description: "源存储区域",
                type: "string",
            })
            .option("source-bucket", {
                description: "源存储桶",
                type: "string",
            })
            // 目标存储凭证
            .option("target-access-key-id", {
                description: "目标存储访问密钥 ID（阿里云）",
                type: "string",
            })
            .option("target-access-key-secret", {
                description: "目标存储访问密钥 Secret（阿里云）",
                type: "string",
            })
            .option("target-secret-id", {
                description: "目标存储密钥 ID（腾讯云）",
                type: "string",
            })
            .option("target-secret-key", {
                description: "目标存储密钥 Key（腾讯云）",
                type: "string",
            })
            .option("target-region", {
                description: "目标存储区域",
                type: "string",
            })
            .option("target-bucket", {
                description: "目标存储桶",
                type: "string",
            })
            // 其他选项
            .option("dry-run", {
                alias: "d",
                description: "预览模式，不实际执行复制",
                type: "boolean",
                default: false,
            })
            .option("concurrency", {
                alias: "n",
                description: "并发数",
                type: "number",
                default: 5,
            })
            .option("verbose", {
                alias: "v",
                description: "详细输出",
                type: "boolean",
                default: false,
            })
            .option("target-domain", {
                description: "目标自定义域名",
                type: "string",
            })
            .option("prefix", {
                alias: "p",
                description: "目标路径前缀",
                type: "string",
            })
            .option("naming-template", {
                alias: "t",
                description: "命名模板",
                type: "string",
            })
            .option("overwrite", {
                description: "是否覆盖已存在的文件",
                type: "boolean",
                default: false,
            })
            .option("temp-dir", {
                description: "临时目录路径",
                type: "string",
            })
            .option("quiet", {
                alias: "q",
                description: "静默模式",
                type: "boolean",
                default: false,
            })
            .option("format", {
                alias: "f",
                description: "输出格式 (json|table|plain)",
                choices: ["json", "table", "plain"] as const,
                default: "table",
            })
    );
}

export async function handler(argv: CopyCommandOptions): Promise<void> {
    const logger = createLogger(argv.verbose, argv.quiet);
    const configLoader = new ConfigLoader();

    try {
        // 加载配置
        let config: TransferConfig;

        if (argv.config) {
            logger.info(`加载配置文件：${argv.config}`);
            const cmtxConfig = await configLoader.loadFromFile(argv.config);
            config = convertCmtxConfigToTransferConfig(cmtxConfig, argv);
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
 * 将 CmtxConfig 转换为 TransferConfig
 */
function convertCmtxConfigToTransferConfig(
    cmtxConfig: CmtxConfig,
    argv: CopyCommandOptions,
): TransferConfig {
    const storageId = cmtxConfig.upload?.useStorage || "default";
    const storages = cmtxConfig.storages || {};
    const selectedStorage = storages[storageId];

    if (!selectedStorage) {
        throw new Error(`Storage "${storageId}" not found in configuration`);
    }

    const provider =
        (selectedStorage.provider as CloudCredentials["provider"]) || argv.provider || "aliyun-oss";

    // 从 selectedStorage.config 构建凭证
    const credentials = createCredentials(provider, selectedStorage.config || {});

    return {
        source: {
            customDomain: process.env.SOURCE_DOMAIN,
            credentials,
        },
        target: {
            customDomain: argv.targetDomain ?? process.env.TARGET_DOMAIN,
            credentials,
            prefix: argv.prefix,
            overwrite: argv.overwrite,
        },
        options: {
            concurrency: argv.concurrency,
            tempDir: argv.tempDir,
        },
    };
}

interface BuildCredentialsOptions {
    provider: CloudCredentials["provider"];
    idField: string | undefined;
    secretField: string | undefined;
    region: string;
    bucket: string | undefined;
    label: string;
}

function buildCredentials(opts: BuildCredentialsOptions): CloudCredentials {
    const { provider, idField, secretField, region, bucket, label } = opts;
    if (provider === "aliyun-oss") {
        if (!idField || !secretField || !bucket) {
            throw new Error(`缺少阿里云 OSS ${label}存储凭证`);
        }
        return {
            provider: "aliyun-oss",
            accessKeyId: idField,
            accessKeySecret: secretField,
            region,
            bucket,
        };
    }
    if (!idField || !secretField || !bucket) {
        throw new Error(`缺少腾讯云 COS ${label}存储凭证`);
    }
    return {
        provider: "tencent-cos",
        secretId: idField,
        secretKey: secretField,
        region,
        bucket,
    };
}

/**
 * 覆盖凭证字段
 */
function overrideCredentials(
    creds: CloudCredentials,
    argv: CopyCommandOptions,
    side: "source" | "target",
): CloudCredentials {
    const region = side === "source" ? argv.sourceRegion : argv.targetRegion;
    const bucket = side === "source" ? argv.sourceBucket : argv.targetBucket;

    if (creds.provider === "aliyun-oss") {
        const keyId = side === "source" ? argv.sourceAccessKeyId : argv.targetAccessKeyId;
        const keySecret =
            side === "source" ? argv.sourceAccessKeySecret : argv.targetAccessKeySecret;
        return {
            ...creds,
            ...(keyId && { accessKeyId: keyId }),
            ...(keySecret && { accessKeySecret: keySecret }),
            ...(region && { region }),
            ...(bucket && { bucket }),
        };
    }

    const secretId = side === "source" ? argv.sourceSecretId : argv.targetSecretId;
    const secretKey = side === "source" ? argv.sourceSecretKey : argv.targetSecretKey;
    return {
        ...creds,
        ...(secretId && { secretId }),
        ...(secretKey && { secretKey }),
        ...(region && { region }),
        ...(bucket && { bucket }),
    };
}

/**
 * 从环境变量构建配置
 */
function buildConfigFromEnv(argv: CopyCommandOptions): TransferConfig {
    const provider = (argv.provider as CloudCredentials["provider"]) || "aliyun-oss";

    const sourceBucket = process.env.SOURCE_BUCKET;
    const targetBucket = process.env.TARGET_BUCKET;
    const sourceSecretId = process.env.SOURCE_SECRET_ID;
    const targetSecretId = process.env.TARGET_SECRET_ID;

    if (!sourceBucket && !sourceSecretId) {
        throw new Error("缺少源存储凭证，请设置环境变量");
    }
    if (!targetBucket && !targetSecretId) {
        throw new Error("缺少目标存储凭证，请设置环境变量");
    }

    const sourceCredentials = buildCredentials({
        provider,
        idField: process.env.SOURCE_ACCESS_KEY_ID || process.env.SOURCE_SECRET_ID,
        secretField: process.env.SOURCE_ACCESS_KEY_SECRET || process.env.SOURCE_SECRET_KEY,
        region: process.env.SOURCE_REGION || "oss-cn-hangzhou",
        bucket: sourceBucket,
        label: "源",
    });
    const targetCredentials = buildCredentials({
        provider,
        idField: process.env.TARGET_ACCESS_KEY_ID || process.env.TARGET_SECRET_ID,
        secretField: process.env.TARGET_ACCESS_KEY_SECRET || process.env.TARGET_SECRET_KEY,
        region: process.env.TARGET_REGION || "oss-cn-hangzhou",
        bucket: targetBucket,
        label: "目标",
    });

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
    argv: CopyCommandOptions,
): TransferConfig {
    const result: TransferConfig = {
        source: { ...config.source },
        target: { ...config.target },
        options: { ...config.options },
    };

    result.source.credentials = overrideCredentials(result.source.credentials, argv, "source");
    result.target.credentials = overrideCredentials(result.target.credentials, argv, "target");

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
        result.target = {
            ...result.target,
            namingTemplate: argv.namingTemplate,
        };
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
    format: "json" | "table" | "plain",
    _logger: Logger,
): Promise<void> {
    const { createUrlParser } = await import("@cmtx/asset/transfer");
    const fs = await import("node:fs");

    const content = await fs.promises.readFile(filePath, "utf-8");
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
        case "json":
            console.log(JSON.stringify(preview, null, 2));
            break;
        case "table":
            console.log("\n预览结果：");
            console.log("─".repeat(80));
            console.log(`找到 ${matchedUrls.length} 个需要复制的图片：\n`);
            matchedUrls.forEach((url, i) => {
                console.log(`${i + 1}. ${url.originalUrl}`);
                console.log(`   -> 远程路径：${url.remotePath}`);
            });
            console.log("─".repeat(80));
            break;
        case "plain":
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
    format: "json" | "table" | "plain",
    logger: Logger,
): Promise<void> {
    const fs = await import("node:fs");

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
            overwrite: config.target.overwrite,
        },
        options: config.options,
    };

    const manager = createTransferManager(adapterConfig);

    const result = await manager.transferMarkdown(filePath);

    if (result.newContent && result.success > 0) {
        await fs.promises.writeFile(filePath, result.newContent, "utf-8");
        logger.info(`已更新 Markdown 文件：${filePath}`);
    }

    switch (format) {
        case "json":
            console.log(JSON.stringify(result, null, 2));
            break;
        case "table":
            console.log("\n复制完成！");
            console.log("═".repeat(80));
            console.log(`总文件数：${result.total}`);
            console.log(`成功：${result.success}`);
            console.log(`失败：${result.failed}`);
            console.log(`跳过：${result.skipped}`);
            console.log("═".repeat(80));
            break;
        case "plain":
            console.log(`复制完成：${result.success}/${result.total}`);
            if (result.failed > 0) {
                console.log(`失败：${result.failed}`);
            }
            break;
    }

    if (result.errors.length > 0) {
        console.error("\n错误详情:");
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
