/* eslint-disable no-console */
/**
 * section-numbers add 命令 - 为 Markdown 标题添加/更新章节编号
 *
 * 用法：cmtx section-numbers add <filePath> [options]
 * 示例：cmtx section-numbers add ./docs/article.md --min-level 2 --separator "."
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { CmtxConfig } from "@cmtx/asset/config";
import { ConfigLoader } from "@cmtx/asset/config";
import type { Argv, CommandModule } from "yargs";
import type { SectionNumbersAddOptions } from "../../types/cli.js";
import { formatError, formatInfo, formatSuccess } from "../../utils/formatter.js";
import { createLogger } from "../../utils/logger.js";
import { createRuleEngineAdapter } from "../../rules/rule-adapter.js";

export const command = "add <filePath>";
export const description = "为 Markdown 标题添加/更新章节编号";

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
        .option("min-level", {
            description: "最小标题等级（默认 2）",
            type: "number",
        })
        .option("max-level", {
            description: "最大标题等级（默认 6）",
            type: "number",
        })
        .option("start-level", {
            description: "起始层级（默认 2）",
            type: "number",
        })
        .option("separator", {
            description: "编号分隔符（默认 '.'）",
            type: "string",
        })
        .option("output-path", {
            alias: "o",
            description: "输出文件路径（默认覆盖原文件）",
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
            description: "预览结果，不实际修改文件",
            type: "boolean",
            default: false,
        })
        .option("verbose", {
            alias: "v",
            description: "显示详细信息",
            type: "boolean",
            default: false,
        });
}

async function loadSectionNumbersConfig(configPath?: string): Promise<Record<string, unknown>> {
    try {
        const configLoader = new ConfigLoader();
        let cliConfig: CmtxConfig | undefined;

        if (configPath) {
            cliConfig = await configLoader.loadFromFile(configPath);
        } else {
            const defaultConfigPath = await configLoader.findDefaultConfig();
            if (defaultConfigPath) {
                cliConfig = await configLoader.loadFromFile(defaultConfigPath);
            }
        }

        return (cliConfig?.rules?.["add-section-numbers"] as Record<string, unknown>) ?? {};
    } catch {
        return {};
    }
}

export async function handler(options: SectionNumbersAddOptions): Promise<void> {
    const logger = createLogger(options.verbose, false);

    try {
        if (options.outputPath && options.inPlace) {
            console.error(formatError("--output 和 --in-place 参数不能同时使用"));
            process.exit(1);
        }

        const filePath = resolve(options.filePath);
        logger.info(`读取文件: ${filePath}`);

        const content = await readFile(filePath, "utf-8");

        const configOptions = await loadSectionNumbersConfig(options.config);
        const ruleConfig: Record<string, unknown> = {
            ...configOptions,
        };
        if (options.minLevel !== undefined) ruleConfig.minLevel = options.minLevel;
        if (options.maxLevel !== undefined) ruleConfig.maxLevel = options.maxLevel;
        if (options.startLevel !== undefined) ruleConfig.startLevel = options.startLevel;
        if (options.separator !== undefined) ruleConfig.separator = options.separator;

        const ruleAdapter = await createRuleEngineAdapter();
        const result = await ruleAdapter.executeRule("add-section-numbers", content, filePath, {
            ruleConfig,
        });

        if (options.dryRun) {
            console.log(`\n${formatInfo("预览（干运行）")}`);
            console.log("----------------------------------------");
            console.log(`文件: ${filePath}`);
            for (const msg of result.messages ?? []) {
                console.log(`  ${msg}`);
            }
            console.log("----------------------------------------");
            console.log(`\n${formatInfo("这是预览，未实际修改文件")}`);
            return;
        }

        const outputPath = options.outputPath ? resolve(options.outputPath) : filePath;
        await writeFile(outputPath, result.content, "utf-8");

        console.log(`\n${formatSuccess("章节编号已更新")}`);
        for (const msg of result.messages ?? []) {
            console.log(`  ${msg}`);
        }
        console.log(`  输出文件: ${outputPath}`);

        logger.info(`文件已保存: ${outputPath}`);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(formatError(message));
        process.exit(1);
    }
}

const addModule: CommandModule = {
    command,
    describe: description,
    builder,
    handler: (args) => handler(args as unknown as SectionNumbersAddOptions),
};

export default addModule;
