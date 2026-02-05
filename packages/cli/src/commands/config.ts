/**
 * config 命令 - 配置文件管理
 * 
 * 用法：cmtx config <action> [options]
 * 示例：cmtx config init --preset blog-simple
 */

import type { Argv, CommandModule } from "yargs";
import { promises as fs } from 'fs';
import { resolve } from 'path';
import { getPreset, listPresets, generatePresetConfig } from "../config/presets.js";
import { formatInfo, formatError } from "../utils/formatter.js";
import type { ConfigCommandOptions } from "../types/cli.js";

export const command = "config <action>";
export const description = "配置文件管理";

export function builder(yargs: Argv): Argv {
  return yargs
    .positional("action", {
      description: "配置操作 (init|list|show)",
      type: "string",
      choices: ["init", "list", "show"],
    })
    .option("preset", {
      alias: "p",
      description: "预设配置名称",
      type: "string",
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
      case "list":
        await handleList();
        break;
      case "show":
        await handleShow(argv);
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
  try {
    await fs.access(outputPath);
    if (!argv.force) {
      throw new Error(`配置文件已存在: ${outputPath}。使用 --force 选项强制覆盖。`);
    }
  } catch (error) {
    // 文件不存在，继续执行
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  let configContent: string;
  
  if (argv.preset) {
    // 使用预设配置
    configContent = generatePresetConfig(argv.preset as any);
    console.log(formatInfo(`使用预设配置 "${argv.preset}" 初始化配置文件`));
  } else {
    // 使用默认的 minimal 预设
    configContent = generatePresetConfig('minimal');
    console.log(formatInfo("使用默认配置初始化配置文件"));
  }

  await fs.writeFile(outputPath, configContent, 'utf-8');
  console.log(formatInfo(`配置文件已创建: ${outputPath}`));
  console.log("\n请记得设置以下环境变量：");
  console.log("  ALIYUN_OSS_ACCESS_KEY_ID");
  console.log("  ALIYUN_OSS_ACCESS_KEY_SECRET");
  console.log("  ALIYUN_OSS_BUCKET");
}

async function handleList(): Promise<void> {
  const presets = listPresets();
  console.log(formatInfo("可用的预设配置："));
  presets.forEach(preset => {
    console.log(`  - ${preset}`);
  });
  console.log("\n使用方法：cmtx config init --preset <preset-name>");
}

async function handleShow(argv: ConfigCommandOptions): Promise<void> {
  if (!argv.preset) {
    throw new Error("请指定要查看的预设名称：--preset <name>");
  }
  
  try {
    const configContent = generatePresetConfig(argv.preset as any);
    console.log(`\n${configContent}`);
  } catch (error) {
    throw new Error(`无法找到预设配置 "${argv.preset}"`);
  }
}

// 默认导出为 yargs CommandModule
const configModule: CommandModule = {
  command,
  describe: description,
  builder,
  handler: (args) => handler(args as unknown as ConfigCommandOptions),
};

export default configModule;