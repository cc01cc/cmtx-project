/**
 * upload 命令 - 执行上传或预览（dry-run）
 *
 * 用法：cmtx upload <searchDir> [options]
 * 示例：cmtx upload ./docs --adapter oss --prefix blog/images --dry-run
 */

import type { Argv, CommandModule } from "yargs";
import OSS from "ali-oss";
import { analyzeImages, uploadAndReplace, applyNamingStrategy } from "@cmtx/upload";
import { AliOSSAdapter } from "@cmtx/upload/adapters/ali-oss";
import { createLibraryLogger, createLogger } from "../utils/logger.js";
import { formatError, formatInfo, formatUploadPreview } from "../utils/formatter.js";
import { loadConfig, mergeWithEnv } from "../utils/config-loader.js";
import type { UploadCommandOptions } from "../types/cli.js";

export const command = "upload <searchDir>";
export const description = "上传本地图片到对象存储并替换 Markdown 引用";

export function builder(yargs: Argv): Argv {
  return yargs
    .positional("searchDir", {
      description: "搜索目录",
      type: "string",
    })
    .option("project-root", {
      description: "项目根目录",
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
    .option("naming", {
      alias: "n",
      description: "命名策略 (original+timestamp+hash 或自定义)",
      type: "string",
      default: "original+timestamp+hash",
    })
    .option("delete-strategy", {
      alias: "s",
      description: "删除策略 (trash|move|hard-delete)",
      type: "string",
      default: "trash",
    })
    .option("dry-run", {
      description: "预览模式，不实际执行上传/替换/删除",
      type: "boolean",
      default: false,
    })
    .option("output", {
      alias: "o",
      description: "输出格式 (json|table|plain)",
      choices: ["json", "table", "plain"],
      default: "table",
      type: "string",
    });
}

export async function handler(argv: UploadCommandOptions): Promise<void> {
  const logger = createLogger(argv.verbose, argv.quiet);
  const libLogger = createLibraryLogger(argv.verbose);

  try {
    // 加载配置并合并环境变量
    const cfg = mergeWithEnv(await loadConfig(argv.config));

    const projectRoot = argv.projectRoot ?? cfg.projectRoot ?? process.cwd();
    const uploadPrefix = argv.prefix ?? cfg.uploadPrefix;
    const namingStrategy = (argv.naming ?? cfg.namingStrategy ?? "original+timestamp+hash") as import("@cmtx/upload").NamingStrategy;
    const deletionStrategy = (argv.deleteStrategy ?? cfg.deleteStrategy ?? "trash") as import("@cmtx/upload").DeletionStrategy;

    if (argv.dryRun) {
      logger("info", "进入预览模式 (dry-run)，不会产生任何变更");

      const analysis = await analyzeImages({
        projectRoot,
        searchDir: argv.searchDir,
        uploadPrefix,
        namingStrategy,
        deletionStrategy,
        logger: libLogger,
      });

      // 生成预览列表
      const preview = await Promise.all(
        analysis.images.map(async (img) => ({
          imagePath: img.localPath,
          remotePath:
            img.previewRemotePath ??
            (await applyNamingStrategy({ localPath: img.localPath, uploadPrefix, namingStrategy })),
        })),
      );

      const willReplace = analysis.images.reduce((sum, i) => sum + i.referencedIn.length, 0);
      const willDelete = deletionStrategy ? analysis.images.length : 0;

      console.log(formatUploadPreview(preview, willReplace, willDelete, argv.output as "json" | "table" | "plain"));
      logger("info", "预览完成");
      return;
    }

    // 实际上传
    logger("info", `开始上传: ${argv.searchDir}`);
    const adapterName = argv.adapter ?? cfg.defaultAdapter ?? "oss";

    if (adapterName !== "oss") {
      throw new Error(`暂不支持的适配器: ${adapterName}`);
    }

    // 读取 OSS 配置
    const ossConfig = (cfg.adapters?.oss ?? {}) as Record<string, string>;
    const region = ossConfig.region ?? process.env.OSS_REGION ?? "oss-cn-hangzhou";
    const accessKeyId = ossConfig.accessKeyId ?? process.env.OSS_ACCESS_KEY_ID;
    const accessKeySecret = ossConfig.accessKeySecret ?? process.env.OSS_ACCESS_KEY_SECRET;
    const bucket = ossConfig.bucket ?? process.env.OSS_BUCKET;

    if (!accessKeyId || !accessKeySecret || !bucket) {
      throw new Error("缺少 OSS 凭证或 bucket，请在配置文件或环境变量中提供 (OSS_ACCESS_KEY_ID/OSS_ACCESS_KEY_SECRET/OSS_BUCKET)");
    }

    const client = new OSS({ region, accessKeyId, accessKeySecret, bucket });
    const adapter = new AliOSSAdapter(client);

    const results = await uploadAndReplace({
      projectRoot,
      searchDir: argv.searchDir,
      adapter,
      uploadPrefix,
      namingStrategy,
      deletionStrategy,
      onEvent: (evt) => logger("info", `[${evt.type}]`, evt.data),
    });

    console.log(formatInfo(`上传完成，共处理 ${results.length} 个图片`));
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
