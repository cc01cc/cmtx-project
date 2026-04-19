/**
 * adapt 命令 - 按规则文件批量改写 Markdown 内容
 *
 * 用法（单文件）：
 *   cmtx adapt ./article.md --rule-file ./zhihu.adapt.yaml --out ./output/zhihu/article.md
 *
 * 用法（目录，处理所有 .md 文件）：
 *   cmtx adapt ./docs/ --rule-file ./zhihu.adapt.yaml --out-dir ./output/zhihu
 *
 * 不指定 --out / --out-dir 时，转换结果输出到 stdout。
 */

import { stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
    type AdaptPlatform,
    type AdaptRule,
    getPlatformAdapter,
    getSupportedPlatforms,
} from '@cmtx/publish';
import {
    adaptDirectory,
    adaptFile,
    loadAdaptConfigFromFile,
    renderDirectory,
    renderFile,
    validateDirectory,
    validateFile,
} from '@cmtx/publish/node';
import type { Argv, CommandModule } from 'yargs';
import type { AdaptCommandOptions } from '../types/cli.js';
import { formatError, formatInfo, formatSuccess } from '../utils/formatter.js';
import { createLogger } from '../utils/logger.js';

export const command = 'adapt <input>';
export const description = '按规则文件批量改写 Markdown 内容，用于多平台格式适配';

export function builder(yargs: Argv): Argv {
    return yargs
        .positional('input', {
            description: 'Markdown 文件或目录路径',
            type: 'string',
        })
        .option('rule-file', {
            alias: 'r',
            description: '规则配置文件路径（.yaml / .yml）',
            type: 'string',
        })
        .option('platform', {
            alias: 'p',
            description: '内置平台规则：wechat | zhihu | csdn',
            choices: getSupportedPlatforms(),
            type: 'string',
        })
        .option('out', {
            alias: 'o',
            description: '输出文件路径（仅当 input 为单个文件时生效）',
            type: 'string',
        })
        .option('check', {
            description: '检查输入内容是否符合平台要求，不写入磁盘',
            type: 'boolean',
            default: false,
        })
        .option('render', {
            description: '按平台渲染输出格式，当前支持 html',
            choices: ['html'] as const,
            type: 'string',
        })
        .option('out-dir', {
            description: '输出目录（当 input 为目录时使用；单文件时也可用）',
            type: 'string',
        })
        .option('dry-run', {
            alias: 'd',
            description: '预览转换结果，不写入磁盘（结果输出到 stdout）',
            type: 'boolean',
            default: false,
        })
        .option('verbose', {
            alias: 'v',
            description: '显示每个文件的处理状态',
            type: 'boolean',
            default: false,
        });
}

export async function handler(options: AdaptCommandOptions): Promise<void> {
    const log = createLogger(options.verbose, false);
    const inputPath = resolve(options.input);

    if (options.check && options.render) {
        console.error(formatError('--check and --render cannot be used together.'));
        process.exitCode = 1;
        return;
    }

    if ((options.check || options.render) && !options.platform) {
        console.error(formatError('--platform <name> is required when using --check or --render.'));
        process.exitCode = 1;
        return;
    }

    if (!options.ruleFile && !options.platform) {
        console.error(formatError('Either --rule-file <path> or --platform <name> is required.'));
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

    const rules = await resolveRules(options, log);

    if (!rules) {
        process.exitCode = 1;
        return;
    }

    if (isDir) {
        await processDirectory(inputPath, rules, options);
    } else {
        await processSingleFile(inputPath, rules, options);
    }
}

async function resolveRules(
    options: AdaptCommandOptions,
    log: ReturnType<typeof createLogger>
): Promise<AdaptRule[] | undefined> {
    if (options.ruleFile) {
        try {
            const config = await loadAdaptConfigFromFile(options.ruleFile);

            if (options.platform) {
                log(
                    'info',
                    `Using rule file ${options.ruleFile}; built-in platform ${options.platform} is ignored.`
                );
            }

            log('info', `Loaded ${config.rules.length} rule(s) from ${options.ruleFile}`);

            return config.rules;
        } catch (err) {
            console.error(
                formatError(
                    `Failed to load rule file "${options.ruleFile}": ${err instanceof Error ? err.message : String(err)}`
                )
            );
            return undefined;
        }
    }

    const platform = options.platform as AdaptPlatform;
    const adapter = await getPlatformAdapter(platform);
    log('info', `Loaded ${adapter.rules.length} built-in rule(s) for ${platform}`);
    return adapter.rules;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function processSingleFile(
    filePath: string,
    rules: AdaptRule[],
    options: AdaptCommandOptions
): Promise<void> {
    const log = createLogger(options.verbose, false);
    let outPath: string | undefined;
    if (options.out) {
        outPath = resolve(options.out);
    } else if (options.outDir) {
        outPath = join(resolve(options.outDir), filePath.split('/').at(-1) ?? 'output.md');
    }

    try {
        const result = await adaptFile(filePath, {
            dryRun: options.dryRun,
            outFile: outPath,
            rules,
        });

        if (options.dryRun || !outPath) {
            process.stdout.write(result.content);
            return;
        }

        log('info', formatSuccess(`Written: ${outPath}`));
        console.log(formatInfo(`Written to ${outPath}`));
    } catch (err) {
        console.error(
            formatError(
                `Cannot process file "${filePath}": ${err instanceof Error ? err.message : String(err)}`
            )
        );
        process.exitCode = 1;
    }
}

async function processDirectory(
    dirPath: string,
    rules: AdaptRule[],
    options: AdaptCommandOptions
): Promise<void> {
    const log = createLogger(options.verbose, false);

    if (!options.dryRun && !options.outDir) {
        console.error(
            formatError(
                'Processing a directory requires --out-dir <path> or --dry-run. ' +
                    'Example: cmtx adapt ./docs --rule-file ./zhihu.adapt.yaml --out-dir ./output/zhihu'
            )
        );
        process.exitCode = 1;
        return;
    }

    try {
        const result = await adaptDirectory(dirPath, {
            dryRun: options.dryRun,
            outDir: options.outDir,
            rules,
        });

        if (result.files.length === 0) {
            console.log(formatInfo(`No .md files found in ${dirPath}`));
            return;
        }

        log('info', `Found ${result.files.length} .md file(s)`);

        if (options.dryRun) {
            for (const file of result.files) {
                process.stdout.write(`\n--- ${file.inputPath} ---\n${file.content}`);
            }

            return;
        }

        for (const file of result.files) {
            if (file.outputPath) {
                log('info', formatSuccess(`Written: ${file.outputPath}`));
            }
        }

        console.log(
            formatSuccess(`Done: ${result.files.length} file(s) written to ${options.outDir}`)
        );
    } catch (err) {
        console.error(
            formatError(
                `Cannot process directory "${dirPath}": ${err instanceof Error ? err.message : String(err)}`
            )
        );
        process.exitCode = 1;
    }
}

async function processCheck(
    inputPath: string,
    isDir: boolean,
    options: AdaptCommandOptions
): Promise<void> {
    const platform = options.platform as AdaptPlatform;

    if (options.ruleFile) {
        console.log(
            formatInfo(
                `Ignoring --rule-file ${options.ruleFile} because --check uses built-in platform validators only.`
            )
        );
    }

    try {
        if (isDir) {
            const summary = await validateDirectory(inputPath, { platform });

            if (summary.files.length === 0) {
                console.log(formatInfo(`No .md files found in ${inputPath}`));
                return;
            }

            for (const file of summary.files) {
                printIssues(file.inputPath, file.issues);
            }

            if (summary.issueCount === 0) {
                console.log(
                    formatSuccess(`Check passed: ${summary.files.length} file(s), no issues.`)
                );
                return;
            }

            console.log(
                formatInfo(
                    `Check found ${summary.issueCount} issue(s) in ${summary.files.length} file(s).`
                )
            );
            process.exitCode = 1;
            return;
        }

        const result = await validateFile(inputPath, { platform });
        printIssues(result.inputPath, result.issues);

        if (result.issues.length === 0) {
            console.log(formatSuccess('Check passed: no issues found.'));
            return;
        }

        console.log(formatInfo(`Check found ${result.issues.length} issue(s).`));
        process.exitCode = 1;
    } catch (err) {
        console.error(
            formatError(
                `Cannot check input "${inputPath}": ${err instanceof Error ? err.message : String(err)}`
            )
        );
        process.exitCode = 1;
    }
}

async function processRender(
    inputPath: string,
    isDir: boolean,
    options: AdaptCommandOptions
): Promise<void> {
    const platform = options.platform as AdaptPlatform;

    if (options.ruleFile) {
        console.log(
            formatInfo(
                `Ignoring --rule-file ${options.ruleFile} because rendering uses built-in platform renderers only.`
            )
        );
    }

    try {
        if (isDir) {
            await renderDirectoryInput(inputPath, platform, options);
            return;
        }

        await renderSingleFileInput(inputPath, platform, options);
    } catch (err) {
        console.error(
            formatError(
                `Cannot render input "${inputPath}": ${err instanceof Error ? err.message : String(err)}`
            )
        );
        process.exitCode = 1;
    }
}

async function renderDirectoryInput(
    inputPath: string,
    platform: AdaptPlatform,
    options: AdaptCommandOptions
): Promise<void> {
    if (!options.dryRun && !options.outDir) {
        console.error(formatError('Rendering a directory requires --out-dir <path> or --dry-run.'));
        process.exitCode = 1;
        return;
    }

    const result = await renderDirectory(inputPath, {
        dryRun: options.dryRun,
        outDir: options.outDir,
        platform,
    });

    if (result.files.length === 0) {
        console.log(formatInfo(`No .md files found in ${inputPath}`));
        return;
    }

    if (options.dryRun) {
        for (const file of result.files) {
            process.stdout.write(`\n--- ${file.inputPath} ---\n${file.content}`);
        }
        return;
    }

    console.log(formatSuccess(`Rendered ${result.files.length} file(s) to ${options.outDir}`));
}

function resolveRenderOutPath(inputPath: string, options: AdaptCommandOptions): string | undefined {
    if (options.out) {
        return resolve(options.out);
    }

    if (options.outDir) {
        const fileName = fileNameWithRenderedExtension(inputPath, 'html');
        return join(resolve(options.outDir), fileName);
    }

    return undefined;
}

async function renderSingleFileInput(
    inputPath: string,
    platform: AdaptPlatform,
    options: AdaptCommandOptions
): Promise<void> {
    const outPath = resolveRenderOutPath(inputPath, options);
    const result = await renderFile(inputPath, {
        dryRun: options.dryRun,
        outFile: outPath,
        platform,
    });

    if (options.dryRun || !outPath) {
        process.stdout.write(result.content);
        return;
    }

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
    }>
): void {
    if (issues.length === 0) {
        return;
    }

    console.log(formatInfo(inputPath));

    for (const issue of issues) {
        const position = issue.line ? `${issue.line}:${issue.column ?? 1}` : '-';
        console.log(`  [${issue.level}] ${issue.code} @ ${position} ${issue.message}`);
    }
}

function fileNameWithRenderedExtension(filePath: string, extension: 'html' | 'md'): string {
    return filePath.split('/').at(-1)?.replace(/\.md$/i, `.${extension}`) ?? `output.${extension}`;
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
