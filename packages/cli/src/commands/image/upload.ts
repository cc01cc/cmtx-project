/* eslint-disable no-console */
/**
 * upload 命令 - 上传 Markdown 文件中的本地图片
 *
 * 用法：cmtx upload <filePath> [options]
 * 示例：cmtx upload ./article.md --provider aliyun-oss --prefix blog/images
 */

import { resolve } from "node:path";
import type { CmtxConfig } from "@cmtx/asset/config";
import { ConfigLoader } from "@cmtx/asset/config";
import type { CloudCredentials, IStorageAdapter } from "@cmtx/storage";
import { createCredentials } from "@cmtx/storage";
import { createAdapter } from "@cmtx/storage/adapters/factory";
import type { ConflictResolutionStrategy } from "@cmtx/asset/upload";
import { publishAndReplaceFile } from "@cmtx/rule-engine/node";
import type { Argv, CommandModule } from "yargs";
import type { UploadCommandOptions } from "../../types/cli.js";
import { formatError, formatInfo } from "../../utils/formatter.js";
import { createLogger } from "../../utils/logger.js";

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
        })
        .option("region", {
            description: "存储区域，如 oss-cn-hangzhou",
            type: "string",
        })
        .option("bucket", {
            description: "存储桶名称",
            type: "string",
        })
        .option("prefix", {
            description: "远程路径前缀，例如 blog/images",
            type: "string",
        })
        .option("conflict-strategy", {
            description: "远程文件冲突处理策略 (skip:保留远程 | overwrite:覆盖为本地)",
            type: "string",
            choices: ["skip", "overwrite"],
        })
        .option("verbose", {
            alias: "v",
            description: "详细输出",
            type: "boolean",
            default: false,
        });
}

type ResolvedConfig = {
    adapter: IStorageAdapter;
    provider: CloudCredentials["provider"];
    prefix: string;
    namingTemplate: string;
    conflictStrategy?: ConflictResolutionStrategy;
};

function resolveConflictStrategy(value?: "skip" | "overwrite"): ConflictResolutionStrategy {
    if (!value) return { type: "skip-all" };
    return value === "overwrite" ? { type: "replace-all" } : { type: "skip-all" };
}

function getDefaultNamingTemplate(): string {
    return "{name}_{hash}{ext}";
}

async function resolveStorageConfig(argv: UploadCommandOptions): Promise<ResolvedConfig> {
    const configLoader = new ConfigLoader();
    let cliConfig: CmtxConfig | undefined;

    if (argv.config) {
        cliConfig = await configLoader.loadFromFile(argv.config);
    } else {
        const defaultConfigPath = await configLoader.findDefaultConfig();
        if (defaultConfigPath) {
            cliConfig = await configLoader.loadFromFile(defaultConfigPath);
        }
    }

    if (cliConfig) {
        const uploadRule = cliConfig.rules?.["upload-images"] ?? {};
        const storageId = (uploadRule.useStorage as string) || "default";
        const storages = cliConfig.storages || {};
        const selectedStorage = storages[storageId];

        if (!selectedStorage) {
            throw new Error(
                `Storage "${storageId}" not found in configuration. ` +
                    `Configured storages: ${Object.keys(storages).join(", ") || "(none)"}. ` +
                    `Check your cmtx.config.yaml.`,
            );
        }

        const provider =
            (selectedStorage.provider as CloudCredentials["provider"]) ||
            argv.provider ||
            "aliyun-oss";
        const credentials = createCredentials(provider, selectedStorage.config || {});
        const adapter = await createAdapter(credentials);

        return {
            adapter,
            provider,
            prefix: (uploadRule.prefix as string) || argv.prefix || "",
            namingTemplate: (uploadRule.namingTemplate as string) || getDefaultNamingTemplate(),
            conflictStrategy: resolveConflictStrategy(argv.conflictStrategy),
        };
    }

    if (!argv.provider) {
        throw new Error(
            "未找到配置文件，请提供 cmtx.config.yaml(--config) 或指定 --provider。\n" +
                "示例：cmtx upload article.md --provider aliyun-oss --region oss-cn-hangzhou --bucket my-bucket",
        );
    }

    const credentials = createCredentials(argv.provider, {
        region: argv.region,
        bucket: argv.bucket,
    });
    const adapter = await createAdapter(credentials);

    return {
        adapter,
        provider: argv.provider,
        prefix: argv.prefix || "",
        namingTemplate: getDefaultNamingTemplate(),
        conflictStrategy: resolveConflictStrategy(argv.conflictStrategy),
    };
}

export async function handler(argv: UploadCommandOptions): Promise<void> {
    const logger = createLogger(argv.verbose);

    try {
        const absolutePath = resolve(argv.filePath);

        logger.info(`处理文件：${absolutePath}`);

        const { provider, adapter, prefix, namingTemplate, conflictStrategy } =
            await resolveStorageConfig(argv);
        logger.info(`使用云存储：${provider}`);

        logger.info(`发现本地图片，开始上传...`);
        const result = await publishAndReplaceFile(absolutePath, {
            adapter,
            namingTemplate,
            prefix,
            conflictStrategy,
        });

        const report = [
            `上传完成！`,
            `  修改：${result.modified ? "是" : "否"}`,
            `  上传：${result.uploaded}`,
        ];
        console.log(formatInfo(report.join("\n")));
    } catch (error) {
        const message = error instanceof Error ? error : new Error(String(error));
        console.error(formatError(message));
        process.exit(1);
    }
}

const uploadModule: CommandModule = {
    command,
    describe: description,
    builder,
    handler: (args) => handler(args as unknown as UploadCommandOptions),
};

export default uploadModule;
