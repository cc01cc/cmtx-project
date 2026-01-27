/**
 * analyze 命令 - 分析并列出 Markdown 中的所有图片
 *
 * 用法：cmtx analyze <searchDir> [options]
 * 示例：cmtx analyze ./docs --depth 3 --output table
 */

import { extractImagesFromDirectory } from "@cmtx/core";
import type { Argv, CommandModule } from "yargs";
import type { AnalyzeCommandOptions } from "../types/cli.js";
import { createLogger, createLibraryLogger } from "../utils/logger.js";
import { formatAnalyzeResult, formatError } from "../utils/formatter.js";

export const command = "analyze <searchDir>";
export const description = "扫描并分析 Markdown 文件中的图片";

export function builder(yargs: Argv): Argv {
  return yargs
    .positional("searchDir", {
      description: "搜索目录",
      type: "string",
    })
    .option("depth", {
      alias: "d",
      description: "递归深度 (all | 0-N)",
      type: "number",
    })
    .option("extensions", {
      alias: "e",
      description: "允许的文件扩展名，逗号分隔 (.jpg,.png,.gif)",
      type: "string",
    })
    .option("maxSize", {
      alias: "m",
      description: "最大文件大小（字节）",
      type: "number",
    })
    .option("output", {
      alias: "o",
      description: "输出格式 (json|table|plain)",
      choices: ["json", "table", "plain"],
      default: "table",
      type: "string",
    });
}

export async function handler(argv: AnalyzeCommandOptions): Promise<void> {
  try {
    const logger = createLogger(argv.verbose, argv.quiet);
    const libLogger = createLibraryLogger(argv.verbose);

    logger("info", `扫描目录: ${argv.searchDir}`);

    const result = await extractImagesFromDirectory(argv.searchDir, {
      projectRoot: argv.projectRoot,
      depth: argv.depth,
      logger: libLogger,
    });

    // 转换为 UploadAnalysis 格式
    const analysis = {
      images: result.map((item) => ({
        localPath: item.relativePath,
        fileSize: 0, // extractImagesFromDirectory 不提供文件大小
        referencedIn: [],
      })),
      skipped: [],
      totalSize: 0,
      totalCount: result.length,
    };

    const formatted = formatAnalyzeResult(analysis, argv.output as "json" | "table" | "plain");
    console.log(formatted);

    logger("info", `扫描完成，找到 ${result.length} 个图片`);
  } catch (error) {
    const message = error instanceof Error ? error : String(error);
    console.error(formatError(message));
    process.exit(1);
  }
}

// 默认导出为 yargs CommandModule
const analyzeModule: CommandModule = {
  command,
  describe: description,
  builder,
  handler: (args) => handler(args as unknown as AnalyzeCommandOptions),
};

export default analyzeModule;
