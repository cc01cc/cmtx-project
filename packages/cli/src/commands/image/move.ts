import type { Argv, CommandModule } from "yargs";
import type { MoveCommandOptions } from "../../types/cli.js";
import { formatError } from "../../utils/formatter.js";
import { createLogger } from "../../utils/logger.js";
import { createTransferAssetsService } from "@cmtx/asset";
import type { Logger } from "@cmtx/core";
import { ConfigLoader } from "@cmtx/asset/config";
import { createCredentials } from "@cmtx/storage";
import { createAdapter } from "@cmtx/storage/adapters/factory";
import fs from "node:fs";
import type { TransferConfig, CloudCredentials } from "@cmtx/asset/transfer";
import type { CmtxConfig } from "@cmtx/asset/config";

export const command = "move <filePath>";
export const description = "移动 Markdown 文件中的远程图片到目标存储（源文件删除）";

export function builder(yargs: Argv): Argv {
    return yargs
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
            choices: ["aliyun-oss", "tencent-cos"] as const,
            default: "aliyun-oss",
        })
        .option("source-access-key-id", { description: "源存储访问密钥 ID", type: "string" })
        .option("source-access-key-secret", {
            description: "源存储访问密钥 Secret",
            type: "string",
        })
        .option("source-region", { description: "源存储区域", type: "string" })
        .option("source-bucket", { description: "源存储桶", type: "string" })
        .option("target-access-key-id", { description: "目标存储访问密钥 ID", type: "string" })
        .option("target-access-key-secret", {
            description: "目标存储访问密钥 Secret",
            type: "string",
        })
        .option("target-region", { description: "目标存储区域", type: "string" })
        .option("target-bucket", { description: "目标存储桶", type: "string" })
        .option("target-domain", { description: "目标自定义域名", type: "string" })
        .option("prefix", { alias: "p", description: "目标路径前缀", type: "string" })
        .option("naming-template", { alias: "t", description: "命名模板", type: "string" })
        .option("concurrency", { alias: "n", description: "并发数", type: "number", default: 5 })
        .option("overwrite", {
            description: "是否覆盖已存在的文件",
            type: "boolean",
            default: false,
        })
        .option("temp-dir", { description: "临时目录路径", type: "string" })
        .option("dry-run", { alias: "d", description: "预览模式", type: "boolean", default: false })
        .option("verbose", { alias: "v", description: "详细输出", type: "boolean", default: false })
        .option("quiet", { alias: "q", description: "静默模式", type: "boolean", default: false })
        .option("format", {
            alias: "f",
            description: "输出格式 (json|table|plain)",
            choices: ["json", "table", "plain"] as const,
            default: "table",
        });
}

export async function handler(argv: MoveCommandOptions): Promise<void> {
    const logger = createLogger(argv.verbose, argv.quiet);

    try {
        await executeMove(argv, logger);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(formatError(message));
        process.exit(1);
    }
}

async function executeMove(argv: MoveCommandOptions, logger: Logger): Promise<void> {
    const configLoader = new ConfigLoader();
    let config: TransferConfig;

    if (argv.config) {
        logger.info(`加载配置文件：${argv.config}`);
        const cmtxConfig = await configLoader.loadFromFile(argv.config);
        config = convertCmtxConfigToTransferConfig(cmtxConfig, argv);
    } else {
        config = buildTransferConfigFromEnv(argv);
    }

    const sourceAdapter = await createAdapter(config.source.credentials);
    const targetAdapter = await createAdapter(config.target.credentials);

    const transferService = createTransferAssetsService({
        sourceAdapters: [
            {
                domain: config.source.customDomain ?? "",
                adapter: sourceAdapter,
            },
        ],
        targetAdapter,
        targetPrefix: config.target.prefix,
        targetCustomDomain: config.target.customDomain,
        namingTemplate: config.target.namingTemplate,
        concurrency: config.options?.concurrency,
        deleteSource: true,
    });

    const content = await fs.promises.readFile(argv.filePath, "utf-8");
    const result = await transferService.transferImages(content, argv.filePath, {
        sourceDomain: config.source.customDomain,
        concurrency: config.options?.concurrency,
        deleteSource: true,
    });

    if (result.content !== content && result.transferred > 0) {
        await fs.promises.writeFile(argv.filePath, result.content, "utf-8");
        logger.info(`已更新 Markdown 文件：${argv.filePath}`);
    }

    // 输出结果
    const total = result.transferred + result.failed + result.skipped;
    logger.info(`移动完成：${result.transferred}/${total}`);
    if (result.failed > 0) {
        logger.info(`失败：${result.failed}`);
    }
    if (result.errors.length > 0) {
        result.errors.forEach((err) => logger.info(`  - ${err.url}: ${err.error}`));
    }
    if (result.failed > 0) {
        process.exit(1);
    }
}

function convertCmtxConfigToTransferConfig(
    cmtxConfig: CmtxConfig,
    argv: MoveCommandOptions,
): TransferConfig {
    const uploadRule = cmtxConfig.rules?.["upload-images"] ?? {};
    const storageId = (uploadRule.useStorage as string) || "default";
    const storages = cmtxConfig.storages || {};
    const selectedStorage = storages[storageId];
    if (!selectedStorage) {
        throw new Error(`Storage "${storageId}" not found in configuration`);
    }
    const provider =
        (selectedStorage.provider as CloudCredentials["provider"]) || argv.provider || "aliyun-oss";
    const credentials = createCredentials(provider, selectedStorage.config || {});
    return {
        source: { customDomain: process.env.SOURCE_DOMAIN, credentials },
        target: {
            customDomain: argv.targetDomain ?? process.env.TARGET_DOMAIN,
            credentials,
            prefix: argv.prefix,
            overwrite: argv.overwrite,
        },
        options: { concurrency: argv.concurrency, tempDir: argv.tempDir },
    };
}

function buildTransferConfigFromEnv(argv: MoveCommandOptions): TransferConfig {
    const provider = (argv.provider as CloudCredentials["provider"]) || "aliyun-oss";
    const sourceBucket = process.env.SOURCE_BUCKET;
    const targetBucket = process.env.TARGET_BUCKET;
    if (!sourceBucket) throw new Error("缺少源存储配置");
    if (!targetBucket) throw new Error("缺少目标存储配置");
    const sourceRegion = process.env.SOURCE_REGION || "oss-cn-hangzhou";
    const targetRegion = process.env.TARGET_REGION || "oss-cn-hangzhou";
    let sourceCredentials: CloudCredentials;
    let targetCredentials: CloudCredentials;
    if (provider === "aliyun-oss") {
        sourceCredentials = {
            provider: "aliyun-oss",
            accessKeyId: process.env.SOURCE_ACCESS_KEY_ID || "",
            accessKeySecret: process.env.SOURCE_ACCESS_KEY_SECRET || "",
            region: sourceRegion,
            bucket: sourceBucket,
        };
        targetCredentials = {
            provider: "aliyun-oss",
            accessKeyId: process.env.TARGET_ACCESS_KEY_ID || "",
            accessKeySecret: process.env.TARGET_ACCESS_KEY_SECRET || "",
            region: targetRegion,
            bucket: targetBucket,
        };
    } else {
        sourceCredentials = {
            provider: "tencent-cos",
            secretId: process.env.SOURCE_SECRET_ID || "",
            secretKey: process.env.SOURCE_SECRET_KEY || "",
            region: sourceRegion,
            bucket: sourceBucket,
        };
        targetCredentials = {
            provider: "tencent-cos",
            secretId: process.env.TARGET_SECRET_ID || "",
            secretKey: process.env.TARGET_SECRET_KEY || "",
            region: targetRegion,
            bucket: targetBucket,
        };
    }
    return {
        source: { customDomain: process.env.SOURCE_DOMAIN, credentials: sourceCredentials },
        target: {
            customDomain: argv.targetDomain ?? process.env.TARGET_DOMAIN,
            credentials: targetCredentials,
            prefix: argv.prefix,
            overwrite: argv.overwrite,
        },
        options: { concurrency: argv.concurrency, tempDir: argv.tempDir },
    };
}

const moveModule: CommandModule = {
    command,
    describe: description,
    builder,
    handler: (args) => handler(args as unknown as MoveCommandOptions),
};

export default moveModule;
