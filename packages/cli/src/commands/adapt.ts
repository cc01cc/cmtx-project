/* eslint-disable no-console */
/**
 * adapt 命令 - 按 Preset 批量改写 Markdown 内容
 *
 * - 使用 @cmtx/publish 的 Preset 系统（内部使用 Rule 引擎）
 * - 支持 --platform 参数指定已注册的 preset 名称
 * - 支持 --check 校验和 --render 渲染功能
 *
 * 用法（单文件）：
 *   cmtx adapt ./article.md --platform my-preset --out ./output/article.md
 *
 * 用法（目录，处理所有 .md 文件）：
 *   cmtx adapt ./docs/ --platform my-preset --out-dir ./output
 *
 * 不指定 --out / --out-dir 时，转换结果输出到 stdout。
 */

import { stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { FileService } from "@cmtx/asset/file";
import { adaptMarkdown, renderMarkdown, validateMarkdown } from "@cmtx/publish";
import type { Argv, CommandModule } from "yargs";
import type { AdaptCommandOptions } from "../types/cli.js";
import { formatError, formatInfo, formatSuccess } from "../utils/formatter.js";
import { createLogger } from "../utils/logger.js";

const fileService = new FileService();

export const command = "adapt <input>";
export const description = "按 Preset 批量改写 Markdown 内容（使用 Rule 引擎）";

export function builder(yargs: Argv): Argv {
    return yargs
        .positional("input", {
            description: "Markdown 文件或目录路径",
            type: "string",
        })
        .option("platform", {
            alias: "p",
            description: "预设名称（如 wechat、zhihu、csdn，需先通过 registerPreset 注册）",
            type: "string",
            demandOption: true,
        })
        .option("out", {
            alias: "o",
            description: "输出文件路径（仅当 input 为单个文件时生效）",
            type: "string",
        })
        .option("check", {
            description: "检查输入内容是否符合平台要求，不写入磁盘",
            type: "boolean",
            default: false,
        })
        .option("render", {
            description: "按平台渲染输出格式，当前支持 html",
            choices: ["html"] as const,
            type: "string",
        })
        .option("out-dir", {
            description: "输出目录（当 input 为目录时使用；单文件时也可用）",
            type: "string",
        })
        .option("dry-run", {
            alias: "d",
            description: "预览转换结果，不写入磁盘（结果输出到 stdout）",
            type: "boolean",
            default: false,
        })
        .option("verbose", {
            alias: "v",
            description: "显示每个文件的处理状态",
            type: "boolean",
            default: false,
        });
}

export async function handler(options: AdaptCommandOptions): Promise<void> {
    const _log = createLogger(options.verbose, false);
    const inputPath = resolve(options.input);

    if (options.check && options.render) {
        console.error(formatError("--check and --render cannot be used together."));
        process.exitCode = 1;
        return;
    }

    if (!options.platform) {
        console.error(formatError("--platform <name> is required."));
        process.exitCode = 1;
        return;
    }

    // Validate input exists
    let isDir = false;
    try {
        const s = await stat(inputPath);
        isDir = s.isDirectory();
    } catch {
        console.error(formatError(`Input not found: ${options.input}`));
        process.exitCode = 1;
        return;
    }

    if (options.check) {
        await processCheck(inputPath, isDir, options);
        return;
    }

    if (options.render) {
        await processRender(inputPath, isDir, options);
        return;
    }

    if (isDir) {
        await processDirectory(inputPath, options);
    } else {
        await processSingleFile(inputPath, options);
    }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function processSingleFile(filePath: string, options: AdaptCommandOptions): Promise<void> {
    const log = createLogger(options.verbose, false);
    let outPath: string | undefined;
    if (options.out) {
        outPath = resolve(options.out);
    } else if (options.outDir) {
        outPath = join(resolve(options.outDir), filePath.split("/").at(-1) ?? "output.md");
    }

    try {
        const content = await fileService.readFileContent(filePath);
        const result = await adaptMarkdown(content, options.platform!);

        if (options.dryRun || !outPath) {
            process.stdout.write(result.content);
            return;
        }

        await fileService.writeFileContent(outPath, result.content);
        log.info(formatSuccess(`Written: ${outPath}`));
        console.log(formatInfo(`Written to ${outPath}`));
    } catch (err) {
        console.error(
            formatError(
                `Cannot process file "${filePath}": ${
                    err instanceof Error ? err.message : String(err)
                }`,
            ),
        );
        process.exitCode = 1;
    }
}

async function processDirectory(dirPath: string, options: AdaptCommandOptions): Promise<void> {
    const log = createLogger(options.verbose, false);

    if (!options.dryRun && !options.outDir) {
        console.error(
            formatError(
                "Processing a directory requires --out-dir <path> or --dry-run. " +
                    "Example: cmtx adapt ./docs --platform my-preset --out-dir ./output",
            ),
        );
        process.exitCode = 1;
        return;
    }

    try {
        const files = await fileService.scanDirectory(dirPath, {
            patterns: ["**/*.md", "**/*.markdown"],
            ignore: ["node_modules/**", ".git/**"],
        });

        if (files.length === 0) {
            console.log(formatInfo(`No .md files found in ${dirPath}`));
            return;
        }

        log.info(`Found ${files.length} .md file(s)`);

        if (options.dryRun) {
            for (const filePath of files) {
                const content = await fileService.readFileContent(filePath);
                const result = await adaptMarkdown(content, options.platform!);
                process.stdout.write(`\n--- ${filePath} ---\n${result.content}`);
            }
            return;
        }

        let writtenCount = 0;
        for (const filePath of files) {
            const content = await fileService.readFileContent(filePath);
            const result = await adaptMarkdown(content, options.platform!);

            const relativePath = relative(dirPath, filePath).replace(/\.md$/i, ".md");
            const outPath = join(resolve(options.outDir!), relativePath);

            await fileService.writeFileContent(outPath, result.content);
            writtenCount++;
            log.info(formatSuccess(`Written: ${outPath}`));
        }

        console.log(formatSuccess(`Done: ${writtenCount} file(s) written to ${options.outDir}`));
    } catch (err) {
        console.error(
            formatError(
                `Cannot process directory "${dirPath}": ${
                    err instanceof Error ? err.message : String(err)
                }`,
            ),
        );
        process.exitCode = 1;
    }
}

async function processCheck(
    inputPath: string,
    isDir: boolean,
    options: AdaptCommandOptions,
): Promise<void> {
    try {
        if (isDir) {
            const files = await fileService.scanDirectory(inputPath, {
                patterns: ["**/*.md", "**/*.markdown"],
                ignore: ["node_modules/**", ".git/**"],
            });

            if (files.length === 0) {
                console.log(formatInfo(`No .md files found in ${inputPath}`));
                return;
            }

            let totalIssues = 0;
            for (const filePath of files) {
                const content = await fileService.readFileContent(filePath);
                const issues = await validateMarkdown(content, options.platform!);

                if (issues.length > 0) {
                    printIssues(filePath, issues);
                }
                totalIssues += issues.length;
            }

            if (totalIssues === 0) {
                console.log(formatSuccess(`Check passed: ${files.length} file(s), no issues.`));
                return;
            }

            console.log(
                formatInfo(`Check found ${totalIssues} issue(s) in ${files.length} file(s).`),
            );
            process.exitCode = 1;
            return;
        }

        const content = await fileService.readFileContent(inputPath);
        const issues = await validateMarkdown(content, options.platform!);
        printIssues(inputPath, issues);

        if (issues.length === 0) {
            console.log(formatSuccess("Check passed: no issues found."));
            return;
        }

        console.log(formatInfo(`Check found ${issues.length} issue(s).`));
        process.exitCode = 1;
    } catch (err) {
        console.error(
            formatError(
                `Cannot check input "${inputPath}": ${
                    err instanceof Error ? err.message : String(err)
                }`,
            ),
        );
        process.exitCode = 1;
    }
}

async function processRender(
    inputPath: string,
    isDir: boolean,
    options: AdaptCommandOptions,
): Promise<void> {
    try {
        if (isDir) {
            await renderDirectoryInput(inputPath, options);
            return;
        }

        await renderSingleFileInput(inputPath, options);
    } catch (err) {
        console.error(
            formatError(
                `Cannot render input "${inputPath}": ${
                    err instanceof Error ? err.message : String(err)
                }`,
            ),
        );
        process.exitCode = 1;
    }
}

async function renderDirectoryInput(
    inputPath: string,
    options: AdaptCommandOptions,
): Promise<void> {
    if (!options.dryRun && !options.outDir) {
        console.error(formatError("Rendering a directory requires --out-dir <path> or --dry-run."));
        process.exitCode = 1;
        return;
    }

    const files = await fileService.scanDirectory(inputPath, {
        patterns: ["**/*.md", "**/*.markdown"],
        ignore: ["node_modules/**", ".git/**"],
    });

    if (files.length === 0) {
        console.log(formatInfo(`No .md files found in ${inputPath}`));
        return;
    }

    if (options.dryRun) {
        for (const filePath of files) {
            const content = await fileService.readFileContent(filePath);
            const result = await renderMarkdown(content, options.platform!);
            process.stdout.write(`\n--- ${filePath} ---\n${result.content}`);
        }
        return;
    }

    let renderedCount = 0;
    for (const filePath of files) {
        const content = await fileService.readFileContent(filePath);
        const result = await renderMarkdown(content, options.platform!);

        const relativePath = relative(inputPath, filePath).replace(
            /\.md$/i,
            result.format === "html" ? ".html" : ".md",
        );
        const outPath = join(resolve(options.outDir!), relativePath);

        await fileService.writeFileContent(outPath, result.content);
        renderedCount++;
    }

    console.log(formatSuccess(`Rendered ${renderedCount} file(s) to ${options.outDir}`));
}

async function renderSingleFileInput(
    inputPath: string,
    options: AdaptCommandOptions,
): Promise<void> {
    let outPath: string | undefined;
    if (options.out) {
        outPath = resolve(options.out);
    } else if (options.outDir) {
        const fileName = inputPath.split("/").at(-1)?.replace(/\.md$/i, ".html") ?? `output.html`;
        outPath = join(resolve(options.outDir), fileName);
    }

    const content = await fileService.readFileContent(inputPath);
    const result = await renderMarkdown(content, options.platform!);

    if (options.dryRun || !outPath) {
        process.stdout.write(result.content);
        return;
    }

    await fileService.writeFileContent(outPath, result.content);
    console.log(formatInfo(`Written to ${outPath}`));
}

function printIssues(
    inputPath: string,
    issues: Array<{
        code: string;
        level: string;
        message: string;
        line?: number;
        column?: number;
    }>,
): void {
    if (issues.length === 0) {
        return;
    }

    console.log(formatInfo(inputPath));

    for (const issue of issues) {
        const position = issue.line ? `${issue.line}:${issue.column ?? 1}` : "-";
        console.log(`  [${issue.level}] ${issue.code} @ ${position} ${issue.message}`);
    }
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

const adaptCmd: CommandModule<object, AdaptCommandOptions> = {
    command,
    describe: description,
    builder: builder as (yargs: Argv<object>) => Argv<AdaptCommandOptions>,
    handler,
};

export default adaptCmd;
