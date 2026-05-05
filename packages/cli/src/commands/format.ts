/* eslint-disable no-console */
/**
 * format 命令 - 转换 Markdown 文件中的图片格式
 *
 * 用法：cmtx format <filePath> --to <format> [options]
 * 示例：cmtx format ./docs/article.md --to html --output ./docs/article-html.md
 *
 * 使用 Rule 引擎执行格式转换，通过 convert-images Rule 处理图片。
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { RuleResult } from "@cmtx/rule-engine";
import type { Argv, CommandModule } from "yargs";
import { createRuleEngineAdapter } from "../rules/rule-adapter.js";
import type { RuleEngineAdapter } from "../rules/rule-adapter.js";
import type { FormatCommandOptions } from "../types/cli.js";
import { formatError, formatInfo, formatSuccess } from "../utils/formatter.js";
import { createLogger } from "../utils/logger.js";

export const command = "format <filePath>";
export const description = "转换 Markdown 文件中的图片格式（Markdown <=> HTML）";

// ConversionStats 和 TransformOptions 已移除，使用 Rule 引擎处理

export function builder(yargs: Argv): Argv {
    return yargs
        .positional("filePath", {
            description: "Markdown 文件路径",
            type: "string",
        })
        .option("to", {
            alias: "t",
            description: "目标格式",
            choices: ["markdown", "html"],
            demandOption: true,
            type: "string",
        })
        .option("output", {
            alias: "o",
            description: "输出文件路径（默认覆盖原文件）",
            type: "string",
        })
        .option("width", {
            description: "仅对 HTML 图片生效，设置 width 属性（如 400 或 50%）",
            type: "string",
        })
        .option("height", {
            description: "仅对 HTML 图片生效，设置 height 属性（如 240 或 auto）",
            type: "string",
        })
        .option("in-place", {
            alias: "i",
            description: "原地修改文件",
            type: "boolean",
            default: false,
        })
        .option("dry-run", {
            alias: "d",
            description: "预览转换结果，不实际修改文件",
            type: "boolean",
            default: false,
        })
        .option("verbose", {
            alias: "v",
            description: "显示详细转换信息",
            type: "boolean",
            default: false,
        });
}

function resolveOutputPath(filePath: string, output?: string): string {
    return output ? resolve(output) : filePath;
}

// 辅助函数：从 Rule 结果生成统计信息
interface ConversionStats {
    convertedCount: number;
    mdToHtmlCount: number;
    htmlToMdCount: number;
    resizedCount: number;
}

function parseConversionStats(
    messages: string[],
    targetFormat: "markdown" | "html",
): ConversionStats {
    const stats: ConversionStats = {
        convertedCount: 0,
        mdToHtmlCount: 0,
        htmlToMdCount: 0,
        resizedCount: 0,
    };

    for (const msg of messages) {
        if (msg.includes("转换") || msg.includes("converted")) {
            const match = msg.match(/(\d+)/);
            if (match) {
                stats.convertedCount = parseInt(match[1], 10);
                if (targetFormat === "html") {
                    stats.mdToHtmlCount = stats.convertedCount;
                } else {
                    stats.htmlToMdCount = stats.convertedCount;
                }
            }
        }
    }

    return stats;
}

interface FormatSummaryOptions {
    filePath?: string;
    outputPath?: string;
    targetFormat: "markdown" | "html";
    stats: ConversionStats;
    width?: string;
    height?: string;
    verbose?: boolean;
    messages: string[];
}

function printDryRunSummary(options: FormatSummaryOptions): void {
    const { filePath, targetFormat, stats, width, height, verbose, messages } = options;
    console.log(`\n${formatInfo("转换预览（干运行）")}`);
    console.log("----------------------------------------");
    console.log(`文件: ${filePath}`);
    console.log(`目标格式: ${targetFormat}`);
    console.log(`转换图片数: ${stats.convertedCount}`);
    if (stats.mdToHtmlCount > 0) {
        console.log(`Markdown -> HTML: ${stats.mdToHtmlCount}`);
    }
    if (stats.htmlToMdCount > 0) {
        console.log(`HTML -> Markdown: ${stats.htmlToMdCount}`);
    }
    if (stats.resizedCount > 0) {
        console.log(`HTML 尺寸更新: ${stats.resizedCount}`);
    }
    if (targetFormat === "html" && (width || height)) {
        console.log(`目标尺寸: width=${width || "-"}, height=${height || "-"}`);
    }
    console.log("----------------------------------------");

    if (verbose && messages.length > 0) {
        console.log("\n转换详情:");
        for (const msg of messages) {
            console.log(`  ${msg}`);
        }
    }

    console.log(`\n${formatInfo("这是预览，未实际修改文件")}`);
}

function printSuccessSummary(options: FormatSummaryOptions): void {
    const { outputPath, targetFormat, stats, width, height, messages } = options;
    console.log(`\n${formatSuccess("转换完成！")}`);
    console.log(`  转换图片: ${stats.convertedCount}`);
    if (stats.mdToHtmlCount > 0) {
        console.log(`  Markdown -> HTML: ${stats.mdToHtmlCount}`);
    }
    if (stats.htmlToMdCount > 0) {
        console.log(`  HTML -> Markdown: ${stats.htmlToMdCount}`);
    }
    if (stats.resizedCount > 0) {
        console.log(`  HTML 尺寸更新: ${stats.resizedCount}`);
    }
    if (targetFormat === "html" && (width || height)) {
        console.log(`  目标尺寸: width=${width || "-"}, height=${height || "-"}`);
    }
    console.log(`  输出文件: ${outputPath}`);
    if (messages.length > 0) {
        console.log("\n转换详情:");
        for (const msg of messages) {
            console.log(`  ${msg}`);
        }
    }
}

async function executeConvertRule(
    ruleAdapter: RuleEngineAdapter,
    content: string,
    filePath: string,
    targetFormat: string,
): Promise<RuleResult> {
    if (targetFormat === "html") {
        return ruleAdapter.executeRule("convert-images", content, filePath, {
            baseDirectory: filePath,
            ruleConfig: { convertToHtml: true },
        });
    }
    return ruleAdapter.executeRule("convert-images", content, filePath, {
        baseDirectory: filePath,
        ruleConfig: { convertToHtml: false },
    });
}

async function executeResizeRule(
    ruleAdapter: RuleEngineAdapter,
    content: string,
    filePath: string,
    width?: string,
    height?: string,
): Promise<RuleResult> {
    return ruleAdapter.executeRule("resize-image", content, filePath, {
        baseDirectory: filePath,
        ruleConfig: { resize: true, targetWidth: width, targetHeight: height },
    });
}

export async function handler(argv: FormatCommandOptions): Promise<void> {
    const logger = createLogger(argv.verbose, false);

    try {
        // 验证参数
        if (argv.output && argv.inPlace) {
            console.error(formatError("--output 和 --in-place 参数不能同时使用"));
            process.exit(1);
        }

        const targetFormat = argv.to;
        const filePath = resolve(argv.filePath);
        const width = argv.width;
        const height = argv.height;

        logger.info(`读取文件: ${filePath}`);

        // 读取文件内容
        const content = await readFile(filePath, "utf-8");

        // 创建 Rule 引擎适配器
        const ruleAdapter = await createRuleEngineAdapter();
        ruleAdapter.configureCore();

        // 第一步：执行 convert-images Rule
        let result = await executeConvertRule(ruleAdapter, content, filePath, targetFormat);

        // 第二步：执行 resize-image Rule（仅当转换为 HTML 且指定了 width/height 时）
        if (targetFormat === "html" && (width || height)) {
            result = await executeResizeRule(ruleAdapter, result.content, filePath, width, height);
        }

        // 解析统计信息
        const stats = parseConversionStats(result.messages ?? [], targetFormat);

        // 确定输出路径
        const outputPath = resolveOutputPath(filePath, argv.output);

        // 如果是 dry-run，只显示预览
        if (argv.dryRun) {
            printDryRunSummary({
                filePath,
                targetFormat,
                stats,
                width,
                height,
                verbose: Boolean(argv.verbose),
                messages: result.messages ?? [],
            });
            return;
        }

        // 写入文件
        await writeFile(outputPath, result.content, "utf-8");

        // 输出结果
        printSuccessSummary({
            outputPath,
            targetFormat,
            stats,
            width,
            height,
            messages: result.messages ?? [],
        });

        logger.info(`文件已保存: ${outputPath}`);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(formatError(message));
        process.exit(1);
    }
}

// 默认导出为 yargs CommandModule
const formatModule: CommandModule = {
    command,
    describe: description,
    builder,
    handler: (args) => handler(args as unknown as FormatCommandOptions),
};

export default formatModule;
