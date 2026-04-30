/* eslint-disable no-console */
/**
 * config 命令 - 配置文件管理
 *
 * 用法：cmtx config <action> [options]
 * 示例：cmtx config init
 *
 * 迁移说明：
 * - 使用 @cmtx/asset/config 替代 CLI 独立 presets 系统
 * - 提供 generateDefaultConfig 生成默认配置
 * - 不再支持 --preset 参数，统一使用默认配置模板
 */

import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { generateDefaultConfig } from "@cmtx/asset/config";
import { FileService } from "@cmtx/asset/file";
import type { Argv, CommandModule } from "yargs";
import type { ConfigCommandOptions } from "../types/cli.js";
import { formatError, formatInfo } from "../utils/formatter.js";

const fileService = new FileService();

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
}

export const command = "config <action>";
export const description = "配置文件管理（使用 @cmtx/asset/config）";

export function builder(yargs: Argv): Argv {
    return yargs
        .positional("action", {
            description: "配置操作 (init|show)",
            type: "string",
            choices: ["init", "show"],
        })
        .option("output-file", {
            alias: "o",
            description: "输出文件名",
            type: "string",
            default: "cmtx.config.yaml",
        })
        .option("force", {
            alias: "f",
            description: "强制覆盖已存在的文件",
            type: "boolean",
            default: false,
        });
}

export async function handler(argv: ConfigCommandOptions): Promise<void> {
    try {
        switch (argv.action) {
            case "init":
                await handleInit(argv);
                break;
            case "show":
                await handleShow();
                break;
            default:
                throw new Error(`未知的操作: ${argv.action}`);
        }
    } catch (error) {
        const message = error instanceof Error ? error : new Error(String(error));
        console.error(formatError(message));
        process.exit(1);
    }
}

async function handleInit(argv: ConfigCommandOptions): Promise<void> {
    const outputPath = resolve(argv.outputFile || "cmtx.config.yaml");

    // 检查文件是否存在
    const exists = await fileExists(outputPath);
    if (exists && !argv.force) {
        throw new Error(`配置文件已存在: ${outputPath}。使用 --force 选项强制覆盖。`);
    }

    // 使用 @cmtx/asset/config 生成默认配置
    const configContent = generateDefaultConfig();

    await fileService.writeFileContent(outputPath, configContent);
    console.log(formatInfo(`配置文件已创建: ${outputPath}`));
    console.log("\n请记得设置以下环境变量：");
    console.log("  CMTX_ALIYUN_ACCESS_KEY_ID");
    console.log("  CMTX_ALIYUN_ACCESS_KEY_SECRET");
    console.log("  CMTX_ALIYUN_BUCKET");
}

async function handleShow(): Promise<void> {
    // 使用 @cmtx/asset/config 显示默认配置模板
    const configContent = generateDefaultConfig();
    console.log(`\n${configContent}`);
}

// 默认导出为 yargs CommandModule
const configModule: CommandModule = {
    command,
    describe: description,
    builder,
    handler: (args) => handler(args as unknown as ConfigCommandOptions),
};

export default configModule;
