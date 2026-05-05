/* eslint-disable no-console */
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { DeleteService } from "@cmtx/asset";
import type { PruneOptions as PruneServiceOptions } from "@cmtx/asset";
import type { Argv, CommandModule } from "yargs";
import type { PruneCommandOptions } from "../../types/cli.js";
import type { LocalImageEntry } from "@cmtx/asset/file";
import { formatError, formatInfo, formatSuccess, formatWarning } from "../../utils/formatter.js";
import { createLogger } from "../../utils/logger.js";
import { loadConfig } from "../../utils/config-loader.js";

export const command = "prune <searchDir>";
export const describe = "清理目录下所有未被 Markdown 文件引用的图片";

export function builder(yargs: Argv): Argv {
    return yargs
        .positional("searchDir", {
            description: "要清理的图片目录",
            type: "string",
        })
        .option("strategy", {
            alias: "s",
            description: "删除策略",
            choices: ["trash", "move", "hard-delete"] as const,
            default: "trash",
        })
        .option("move-dir", {
            description: "move 策略的目标目录",
            type: "string",
        })
        .option("dry-run", {
            description: "预览模式，不实际删除",
            type: "boolean",
            default: false,
        })
        .option("force", {
            alias: "f",
            description: "强制删除（跳过确认）",
            type: "boolean",
            default: false,
        })
        .option("yes", {
            alias: "y",
            description: "自动确认，不进行交互提示",
            type: "boolean",
            default: false,
        })
        .option("extensions", {
            alias: "e",
            description: "图片扩展名过滤，逗号分隔",
            type: "string",
        })
        .option("max-size", {
            alias: "m",
            description: "最大文件大小（字节），超出则跳过",
            type: "number",
        })
        .option("output", {
            alias: "o",
            description: "输出格式 (json|table|plain)",
            choices: ["json", "table", "plain"] as const,
            default: "table",
        });
}

async function resolveProjectRoot(argv: PruneCommandOptions): Promise<string> {
    if (argv.projectRoot) return resolve(argv.projectRoot);
    const config = await loadConfig(argv.config);
    if (config.projectRoot) return resolve(config.projectRoot);
    if (process.env.CMTX_PROJECT_ROOT) return resolve(process.env.CMTX_PROJECT_ROOT);
    return process.cwd();
}

function promptConfirm(message: string): Promise<boolean> {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(`${message} (y/N) `, (answer) => {
            rl.close();
            resolve(answer.trim().toLowerCase() === "y" || answer.trim().toLowerCase() === "yes");
        });
    });
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
}

export async function handler(argv: PruneCommandOptions): Promise<void> {
    const logger = createLogger(argv.verbose);
    const workspaceRoot = await resolveProjectRoot(argv);
    const searchDir = resolve(argv.searchDir);
    const isDryRun = !!argv["dry-run"];
    const isForce = !!argv.force;
    const isYes = !!argv.yes;
    const outputFormat = (argv.output ?? "table") as "json" | "table" | "plain";

    logger.debug(`Search dir: ${searchDir}`);
    logger.debug(`Workspace root: ${workspaceRoot}`);
    logger.debug(`Strategy: ${argv.strategy ?? "trash"}`);
    logger.debug(`Dry-run: ${isDryRun}`);

    const deleteService = new DeleteService(
        {
            workspaceRoot,
            options: {
                strategy: argv.strategy ?? "trash",
                trashDir: argv["move-dir"],
            },
        },
        logger,
    );

    try {
        // 1. 扫描目录
        console.log(formatInfo("正在扫描目录..."));

        const serviceOptions: PruneServiceOptions = {
            strategy: argv.strategy ?? "trash",
            trashDir: argv["move-dir"],
        };

        if (argv.extensions) {
            serviceOptions.extensions = argv.extensions
                .split(",")
                .map((e) => e.trim().replace(/^\./, ""));
        }
        if (argv["max-size"]) {
            serviceOptions.maxSize = argv["max-size"];
        }

        // 先通过 analyze 获取 orphan 信息（用于展示预览）
        const { FileService } = await import("@cmtx/asset/file");
        const fileService = new FileService();
        const analysis = await fileService.analyzeDirectory(searchDir, {
            extensions: serviceOptions.extensions,
            maxSize: serviceOptions.maxSize,
        });

        const orphans = analysis.images.filter(
            (img): img is LocalImageEntry => img.type === "local" && img.orphan,
        );

        if (orphans.length === 0) {
            console.log(formatInfo("没有发现未引用的图片"));
            return;
        }

        // 2. 展示摘要
        const totalSize = orphans.reduce((s, o) => s + o.fileSize, 0);
        console.log("");
        console.log(
            formatInfo(`发现 ${orphans.length} 张未引用图片，共 ${formatFileSize(totalSize)}`),
        );

        if (outputFormat !== "json") {
            for (const orphan of orphans) {
                const sizeStr = formatFileSize(orphan.fileSize);
                console.log(`  ${orphan.absPath} (${sizeStr})`);
            }
            console.log("");
        }

        // 3. dry-run
        if (isDryRun) {
            console.log(formatWarning("[DRY-RUN] 预览模式，不实际执行"));
            return;
        }

        // 4. 确认
        if (!isForce && !isYes) {
            const confirmed = await promptConfirm(
                `将删除 ${orphans.length} 张未引用的图片，确定吗？`,
            );
            if (!confirmed) {
                console.log(formatInfo("已取消清理"));
                return;
            }
        }

        // 5. 执行清理
        console.log(formatInfo("正在清理..."));
        const result = await deleteService.pruneDirectory(searchDir, serviceOptions);

        // 6. 输出结果
        console.log("");

        if (outputFormat === "json") {
            console.log(
                JSON.stringify(
                    {
                        success: result.failedCount === 0,
                        totalOrphans: result.totalOrphans,
                        deletedCount: result.deletedCount,
                        failedCount: result.failedCount,
                        skippedCount: result.skippedCount,
                        freedSize: result.freedSize,
                        freedSizeFormatted: formatFileSize(result.freedSize),
                        entries: result.entries,
                    },
                    null,
                    2,
                ),
            );
        } else {
            const line = `  已删除: ${result.deletedCount}  失败: ${result.failedCount}  跳过: ${result.skippedCount}`;
            if (result.deletedCount > 0) {
                console.log(formatSuccess(line));
                console.log(formatInfo(`释放空间: ${formatFileSize(result.freedSize)}`));
            } else if (result.failedCount > 0) {
                console.log(formatError(line));
            } else {
                console.log(formatWarning(line));
            }

            if (result.failedCount > 0 && outputFormat !== "plain") {
                console.log("");
                console.log(formatWarning("失败详情:"));
                for (const entry of result.entries) {
                    if (entry.status === "failed") {
                        console.log(`  ${entry.absPath}: ${entry.error}`);
                    }
                }
            }
        }

        process.exit(result.failedCount > 0 ? 1 : 0);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(formatError(message));
        process.exit(1);
    }
}

const pruneModule: CommandModule = {
    command,
    describe,
    builder,
    handler: (args) => handler(args as unknown as PruneCommandOptions),
};

export default pruneModule;
