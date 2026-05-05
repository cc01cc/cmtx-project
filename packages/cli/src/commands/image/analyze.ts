/* eslint-disable no-console */
import { resolve } from "node:path";
import { FileService } from "@cmtx/asset/file";
import type { AnalyzeOptions } from "@cmtx/asset/file";
import type { Argv, CommandModule } from "yargs";
import type { AnalyzeCommandOptions } from "../../types/cli.js";
import { formatAnalyzeResult, formatError } from "../../utils/formatter.js";
import { createLogger } from "../../utils/logger.js";

export const command = "analyze <searchDir>";
export const description = "扫描并分析目录中的所有图片";

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
            description: "扫描的图片扩展名，逗号分隔（默认: png,jpg,jpeg,gif,svg,webp）",
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
        const fileService = new FileService();

        const searchDir = resolve(argv.searchDir);
        logger.info(`扫描目录: ${searchDir}`);

        const options: AnalyzeOptions = {};
        if (argv.extensions) {
            options.extensions = argv.extensions.split(",").map((e) => e.trim().replace(/^\./, ""));
        }
        if (argv.maxSize) {
            options.maxSize = argv.maxSize;
        }

        const result = await fileService.analyzeDirectory(searchDir, options);

        console.log(formatAnalyzeResult(result, argv.output as "json" | "table" | "plain"));
    } catch (error) {
        const message = error instanceof Error ? error : String(error);
        console.error(formatError(message));
        process.exit(1);
    }
}

const analyzeModule: CommandModule = {
    command,
    describe: description,
    builder,
    handler: (args) => handler(args as unknown as AnalyzeCommandOptions),
};

export default analyzeModule;
