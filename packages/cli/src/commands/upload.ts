/**
 * upload 命令 - 上传 Markdown 文件中的本地图片
 *
 * 用法：cmtx upload <filePath> [options]
 * 示例：cmtx upload ./article.md --adapter oss --prefix blog/images
 */

import type { Argv, CommandModule } from "yargs";
import OSS from "ali-oss";
import { uploadLocalImageInMarkdown, ConfigBuilder } from "@cmtx/upload";
import { AliOSSAdapter } from "@cmtx/upload/adapters/ali-oss";
import { createLogger } from "../utils/logger.js";
import { formatError, formatInfo } from "../utils/formatter.js";
import { ConfigLoader } from "../config/config-loader.js";
import type { UploadCommandOptions } from "../types/cli.js";

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
    .option("adapter", {
      alias: "a",
      description: "存储适配器 (oss)",
      type: "string",
      default: "oss",
    })
    .option("prefix", {
      alias: "p",
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

export async function handler(argv: UploadCommandOptions): Promise<void> {
  const logger = createLogger(argv.verbose);
  const configLoader = new ConfigLoader();

  try {
    // 标准化文件路径为绝对路径
    const absolutePath = argv.filePath.startsWith('/') || argv.filePath.includes(':\\') 
      ? argv.filePath 
      : `${process.cwd()}/${argv.filePath}`;
    
    logger("info", `处理文件: ${absolutePath}`);
    
    // 加载配置
    let cliConfig;
    if (argv.config) {
      // 使用指定的配置文件
      logger("info", `加载配置文件: ${argv.config}`);
      cliConfig = await configLoader.loadFromFile(argv.config);
    } else {
      // 查找默认配置文件
      const defaultConfigPath = await configLoader.findDefaultConfig();
      if (defaultConfigPath) {
        logger("info", `使用默认配置文件: ${defaultConfigPath}`);
        cliConfig = await configLoader.loadFromFile(defaultConfigPath);
      }
    }

    // 验证适配器
    const adapterName = cliConfig?.storage.adapter ?? argv.adapter;
    if (adapterName !== "aliyun-oss") {
      throw new Error(`暂不支持的适配器: ${adapterName}，目前仅支持 aliyun-oss`);
    }

    // 读取 OSS 配置
    const ossConfig = cliConfig?.storage.config || {};
    const region = ossConfig.region || process.env.OSS_REGION || "oss-cn-hangzhou";
    const accessKeyId = ossConfig.accessKeyId || process.env.OSS_ACCESS_KEY_ID;
    const accessKeySecret = ossConfig.accessKeySecret || process.env.OSS_ACCESS_KEY_SECRET;
    const bucket = ossConfig.bucket || process.env.OSS_BUCKET;

    if (!accessKeyId || !accessKeySecret || !bucket) {
      throw new Error("缺少 OSS 凭证，请在配置文件或环境变量中设置相关参数");
    }

    // 创建 OSS 客户端和适配器
    const client = new OSS({ region, accessKeyId, accessKeySecret, bucket });
    const adapter = new AliOSSAdapter(client);

    // 构建配置
    const configBuilder = new ConfigBuilder()
      .storage(adapter, {
        prefix: cliConfig?.storage.prefix || argv.prefix,
        namingPattern: cliConfig?.storage.namingPattern || argv.namingPattern
      });

    // 配置替换选项
    if (cliConfig?.replace?.enabled !== false) {
      const fields = cliConfig?.replace?.fields || {
        src: "{cloudSrc}",
        alt: "{originalAlt}"
      };
      configBuilder.fieldTemplates(fields);
    }

    // 配置删除选项
    const enableDelete = cliConfig?.delete?.enabled ?? argv.enableDelete;
    if (enableDelete) {
      configBuilder.delete({
        strategy: (cliConfig?.delete?.strategy || argv.deleteStrategy || "trash") as any,
        trashDir: cliConfig?.delete?.trashDir || argv.trashDir
      });
    }

    // 添加日志回调
    configBuilder.events(
      undefined,
      (level, message) => {
        if (level === 'error' || level === 'warn' || argv.verbose) {
          console.log(`[${level.toUpperCase()}] ${message}`);
        }
      }
    );

    const config = configBuilder.build();

    // 执行上传
    logger("info", "开始上传...");
    const result = await uploadLocalImageInMarkdown(absolutePath, config);

    // 输出结果
    console.log(formatInfo(
      `上传完成！\n` +
      `  上传图片: ${result.uploaded}\n` +
      `  替换引用: ${result.replaced}\n` +
      `  删除本地: ${result.deleted}`
    ));

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
