/* eslint-disable no-console */
/**
 * upload 命令 - 上传 Markdown 文件中的本地图片
 *
 * 用法：cmtx upload <filePath> [options]
 * 示例：cmtx upload ./article.md --provider aliyun-oss --prefix blog/images
 *
 * 使用 Rule 引擎执行上传，通过 upload-images Rule 处理图片。
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { CloudCredentials, IStorageAdapter } from "@cmtx/storage";
import { createAdapter } from "@cmtx/storage/adapters/factory";
import type { Argv, CommandModule } from "yargs";
import { type CLIConfig, ConfigLoader } from "../config/config-loader.js";
import { createRuleEngineAdapter } from "../rules/rule-adapter.js";
import type { UploadCommandOptions } from "../types/cli.js";
import { formatError, formatInfo } from "../utils/formatter.js";
import { createLogger } from "../utils/logger.js";

export const command = "upload <filePath>";
export const description = "上传 Markdown 文件中的本地图片到对象存储并替换引用";

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
            alias: "p",
            description: "云存储提供商 (aliyun-oss | tencent-cos)",
            type: "string",
            choices: ["aliyun-oss", "tencent-cos"],
            default: "aliyun-oss",
        })
        .option("prefix", {
            description: "远程路径前缀，例如 blog/images",
            type: "string",
        })
        .option("naming-pattern", {
            alias: "n",
            description: "命名模板，例如 {date}_{md5_8}{ext}",
            type: "string",
            default: "{name}_{hash}{ext}",
        })
        .option("enable-delete", {
            description: "启用本地文件删除",
            type: "boolean",
            default: false,
        })
        .option("delete-strategy", {
            description: "删除策略 (trash|move|hard-delete)",
            type: "string",
            default: "trash",
        })
        .option("trash-dir", {
            description: "回收站目录（当 strategy=move 时使用）",
            type: "string",
        })
        .option("root-path", {
            description: "安全删除根路径",
            type: "string",
        })
        .option("verbose", {
            alias: "v",
            description: "详细输出",
            type: "boolean",
            default: false,
        });
}

/**
 * 从环境变量或配置创建凭证
 */
function createCredentials(
    provider: "aliyun-oss" | "tencent-cos",
    config: Record<string, unknown> = {},
): CloudCredentials {
    switch (provider) {
        case "aliyun-oss": {
            const accessKeyId =
                (config.accessKeyId as string) || process.env.ALIYUN_OSS_ACCESS_KEY_ID;
            const accessKeySecret =
                (config.accessKeySecret as string) || process.env.ALIYUN_OSS_ACCESS_KEY_SECRET;
            const region =
                (config.region as string) || process.env.ALIYUN_OSS_REGION || "oss-cn-hangzhou";
            const bucket = (config.bucket as string) || process.env.ALIYUN_OSS_BUCKET;

            if (!accessKeyId || !accessKeySecret || !bucket) {
                throw new Error(
                    "缺少阿里云 OSS 凭证，请设置以下环境变量或配置：\n" +
                        "  - ALIYUN_OSS_ACCESS_KEY_ID\n" +
                        "  - ALIYUN_OSS_ACCESS_KEY_SECRET\n" +
                        "  - ALIYUN_OSS_BUCKET\n" +
                        "  - ALIYUN_OSS_REGION (可选，默认 oss-cn-hangzhou)",
                );
            }

            return {
                provider: "aliyun-oss",
                accessKeyId,
                accessKeySecret,
                region,
                bucket,
            };
        }

        case "tencent-cos": {
            const secretId = (config.secretId as string) || process.env.TENCENT_COS_SECRET_ID;
            const secretKey = (config.secretKey as string) || process.env.TENCENT_COS_SECRET_KEY;
            const region =
                (config.region as string) || process.env.TENCENT_COS_REGION || "ap-guangzhou";
            const bucket = (config.bucket as string) || process.env.TENCENT_COS_BUCKET;

            if (!secretId || !secretKey || !bucket) {
                throw new Error(
                    "缺少腾讯云 COS 凭证，请设置以下环境变量或配置：\n" +
                        "  - TENCENT_COS_SECRET_ID\n" +
                        "  - TENCENT_COS_SECRET_KEY\n" +
                        "  - TENCENT_COS_BUCKET (格式：bucketname-appid)\n" +
                        "  - TENCENT_COS_REGION (可选，默认 ap-guangzhou)",
                );
            }

            return {
                provider: "tencent-cos",
                secretId,
                secretKey,
                region,
                bucket,
            };
        }

        default:
            throw new Error(`不支持的云存储提供商：${String(provider)}`);
    }
}

async function resolveStorageConfig(argv: UploadCommandOptions): Promise<{
    cliConfig: CLIConfig | undefined;
    provider: CloudCredentials["provider"];
    adapter: IStorageAdapter;
    prefix: string;
    namingTemplate: string;
}> {
    const configLoader = new ConfigLoader();
    let cliConfig: CLIConfig | undefined;
    if (argv.config) {
        cliConfig = await configLoader.loadFromFile(argv.config);
    } else {
        const defaultConfigPath = await configLoader.findDefaultConfig();
        if (defaultConfigPath) {
            cliConfig = await configLoader.loadFromFile(defaultConfigPath);
        }
    }

    const storageId = cliConfig?.upload?.useStorage || "default";
    const storages = cliConfig?.storages || {};
    const selectedStorage = storages[storageId];

    if (!selectedStorage) {
        throw new Error(`Storage "${storageId}" not found in configuration`);
    }

    const provider =
        (selectedStorage.provider as CloudCredentials["provider"]) || argv.provider || "aliyun-oss";

    const credentials = createCredentials(provider, selectedStorage.config || {});
    const adapter = await createAdapter(credentials);

    return {
        cliConfig,
        provider,
        adapter,
        prefix: cliConfig?.upload?.prefix || argv.prefix || "",
        namingTemplate: cliConfig?.upload?.namingTemplate || argv.namingPattern || "",
    };
}

export async function handler(argv: UploadCommandOptions): Promise<void> {
    const logger = createLogger(argv.verbose);

    try {
        // 标准化文件路径为绝对路径
        const absolutePath = resolve(argv.filePath);

        logger.info(`处理文件：${absolutePath}`);

        // 加载配置并创建适配器
        const { provider, adapter, prefix, namingTemplate } = await resolveStorageConfig(argv);
        logger.info(`使用云存储：${provider}`);

        // 创建 Rule 引擎适配器（异步）
        const ruleAdapter = await createRuleEngineAdapter();
        ruleAdapter.configureCore();
        ruleAdapter.configureStorage(adapter, { prefix, namingTemplate });

        // 读取文件内容
        const document = await readFile(absolutePath, "utf-8");

        // 执行 upload-images Rule
        logger.info("开始上传...");
        const result = await ruleAdapter.executeRule("upload-images", document, absolutePath, {
            baseDirectory: absolutePath,
            ruleConfig: {
                upload: true,
            },
        });

        // 写回文件（如果内容有修改）
        if (result.modified) {
            await writeFile(absolutePath, result.content, "utf-8");
            logger.info("文件已更新");
        }

        // 输出结果
        const messages = result.messages ?? ["无上传记录"];
        console.log(formatInfo(`上传完成！\n  ${messages.join("\n  ")}`));
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
