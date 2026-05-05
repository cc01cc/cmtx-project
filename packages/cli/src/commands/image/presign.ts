/* eslint-disable no-console */
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

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { CmtxConfig } from "@cmtx/asset/config";
import { ConfigLoader } from "@cmtx/asset/config";
import { filterImagesInText, type ImageMatch } from "@cmtx/core";
import type { CloudCredentials, IStorageAdapter } from "@cmtx/storage";
import { createCredentials } from "@cmtx/storage";
import { createAdapter } from "@cmtx/storage/adapters/factory";
import type { Argv, CommandModule } from "yargs";
import { formatError, formatInfo, formatSuccess, formatWarning } from "../../utils/formatter.js";
import { createLogger } from "../../utils/logger.js";

export const command = "presign [input]";
export const describe = "生成预签名 URL";

interface PresignCommandOptions {
    input?: string;
    url?: string;
    expire?: number;
    provider?: "aliyun-oss" | "tencent-cos";
    config?: string;
    verbose?: boolean;
}

export function builder(yargs: Argv): Argv {
    return yargs
        .positional("input", {
            description: "Markdown 文件路径",
            type: "string",
        })
        .option("url", {
            alias: "u",
            description: "单个图片 URL",
            type: "string",
        })
        .option("expire", {
            alias: "e",
            description: "过期时间（秒）",
            type: "number",
            default: 600,
        })
        .option("provider", {
            alias: "p",
            description: "云存储提供商",
            type: "string",
            choices: ["aliyun-oss", "tencent-cos"] as const,
            default: "aliyun-oss",
        })
        .option("config", {
            alias: "c",
            description: "配置文件路径",
            type: "string",
        })
        .option("verbose", {
            alias: "v",
            description: "详细输出",
            type: "boolean",
            default: false,
        })
        .conflicts("input", "url")
        .check((argv) => {
            if (!argv.input && !argv.url) {
                throw new Error("必须提供 input 文件路径或 --url 参数");
            }
            return true;
        });
}

/**
 * 生成默认域名
 */
function generateDefaultDomain(
    provider: "aliyun-oss" | "tencent-cos",
    bucket: string,
    region: string,
): string {
    switch (provider) {
        case "aliyun-oss":
            return `${bucket}.${region}.aliyuncs.com`;
        case "tencent-cos":
            return `${bucket}.cos.${region}.myqcloud.com`;
        default:
            return "";
    }
}

export async function handler(argv: PresignCommandOptions): Promise<void> {
    const logger = createLogger(argv.verbose);
    const configLoader = new ConfigLoader();

    try {
        // 加载配置
        let cliConfig: CmtxConfig | undefined;
        if (argv.config) {
            logger.info(`加载配置文件：${argv.config}`);
            cliConfig = await configLoader.loadFromFile(argv.config);
        } else {
            const defaultConfigPath = await configLoader.findDefaultConfig();
            if (defaultConfigPath) {
                logger.info(`使用默认配置文件：${defaultConfigPath}`);
                cliConfig = await configLoader.loadFromFile(defaultConfigPath);
            }
        }

        // 获取使用的 storage ID 和配置
        const uploadRule = cliConfig?.rules?.["upload-images"] ?? {};
        const storageId = (uploadRule.useStorage as string) || "default";
        const storages = cliConfig?.storages || {};
        const selectedStorage = storages[storageId];

        if (!selectedStorage) {
            throw new Error(`Storage "${storageId}" not found in configuration`);
        }

        const provider =
            (selectedStorage.provider as CloudCredentials["provider"]) ||
            argv.provider ||
            "aliyun-oss";

        // 创建凭证和适配器
        const credentials = createCredentials(provider, selectedStorage.config || {});
        logger.info(`使用云存储: ${provider}`);
        logger.info(`Bucket: ${credentials.bucket}`);
        logger.info(`Region: ${credentials.region}`);

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
            credentials.region,
        );
        logger.info(`默认域名: ${defaultDomain}`);

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
    defaultDomain: string,
): Promise<void> {
    logger.info(`处理 URL: ${url}`);

    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    logger.info(`域名: ${domain}`);

    // 检查是否匹配默认域名
    if (domain !== defaultDomain && !domain.includes(defaultDomain.split(".")[0] || "")) {
        console.log(
            formatWarning(`警告: URL 域名 (${domain}) 与配置的默认域名 (${defaultDomain}) 不匹配`),
        );
    }

    const remotePath = urlObj.pathname.replace(/^\//, "");
    logger.info(`远程路径: ${remotePath}`);

    try {
        const signedUrl = await adapter.getSignedUrl?.(remotePath, expire, {
            disposition: "inline",
        });

        console.log("");
        console.log(formatInfo("原始 URL:"));
        console.log(`  ${url}`);
        console.log("");
        console.log(formatSuccess("预签名 URL:"));
        console.log(`  ${signedUrl}`);
        console.log("");
        console.log(formatInfo(`过期时间: ${expire} 秒`));
    } catch (error) {
        console.error(
            formatError(
                `生成预签名 URL 失败: ${error instanceof Error ? error.message : String(error)}`,
            ),
        );
        process.exit(1);
    }
}

async function processSingleImage(
    image: ImageMatch,
    adapter: IStorageAdapter,
    expire: number,
    index: number,
    total: number,
): Promise<boolean> {
    const urlObj = new URL(image.src);
    const remotePath = urlObj.pathname.replace(/^\//, "");
    try {
        const signedUrl = await adapter.getSignedUrl?.(remotePath, expire, {
            disposition: "inline",
        });
        console.log(formatSuccess(`[${index}/${total}] 成功`));
        console.log(`  原始: ${image.src}`);
        console.log(`  签名: ${signedUrl}`);
        console.log("");
        return true;
    } catch (error) {
        console.log(formatError(`[${index}/${total}] 失败`));
        console.log(`  URL: ${image.src}`);
        console.log(`  错误: ${error instanceof Error ? error.message : String(error)}`);
        console.log("");
        return false;
    }
}

async function handleMarkdownFile(
    inputPath: string,
    adapter: IStorageAdapter,
    expire: number,
    logger: ReturnType<typeof createLogger>,
    defaultDomain: string,
): Promise<void> {
    const absolutePath = resolve(inputPath);
    logger.info(`处理文件: ${absolutePath}`);

    const content = await readFile(absolutePath, "utf-8");
    const images = filterImagesInText(content, {
        mode: "sourceType",
        value: "web",
    });

    const webImages = images.filter((img) => img.type === "web");

    if (webImages.length === 0) {
        console.log(formatWarning("未找到远程图片"));
        return;
    }

    logger.info(`找到 ${webImages.length} 个远程图片`);

    let matched = 0;
    let processed = 0;
    let failed = 0;

    console.log("");
    console.log(formatInfo("开始处理图片..."));
    console.log("");

    for (const image of webImages) {
        const domain = new URL(image.src).hostname;

        // 检查是否匹配默认域名
        if (domain !== defaultDomain && !domain.includes(defaultDomain.split(".")[0] || "")) {
            logger.debug(`跳过不匹配的域名: ${domain}`);
            continue;
        }

        matched++;
        const success = await processSingleImage(image, adapter, expire, matched, webImages.length);
        if (success) {
            processed++;
        } else {
            failed++;
        }
    }

    // 输出统计
    console.log(formatInfo("处理完成:"));
    console.log(`  总图片数: ${webImages.length}`);
    console.log(`  匹配域名: ${matched}`);
    console.log(`  ${formatSuccess("成功")}: ${processed}`);
    if (failed > 0) {
        console.log(`  ${formatError("失败")}: ${failed}`);
    }

    if (matched === 0) {
        console.log("");
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
