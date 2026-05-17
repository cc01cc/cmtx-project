import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { DeleteService, resolveBaseDirectory } from "@cmtx/asset";
import type { Argv, CommandModule } from "yargs";
import type { PruneCommandOptions } from "../../types/cli.js";
import { formatError, formatInfo, formatSuccess, formatWarning } from "../../utils/formatter.js";
import { createLogger } from "../../utils/logger.js";
import { loadConfig, mergeWithEnv } from "../../utils/config-loader.js";

export const command = "cleanup [searchDir]";
export const describe = "清理未被 Markdown 引用的图片";

export function builder(yargs: Argv): Argv {
    return yargs
        .positional("searchDir", {
            description: "要清理的图片目录（可选，默认使用配置中的 baseDirectory）",
            type: "string",
        })
        .option("strategy", {
            alias: "s",
            description: "删除策略",
            choices: ["trash", "move", "hard-delete"] as const,
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
            description: "跳过确认提示",
            type: "boolean",
        })
        .option("yes", {
            alias: "y",
            description: "自动确认，跳过交互提示",
            type: "boolean",
            default: false,
        });
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

export async function handler(options: PruneCommandOptions): Promise<void> {
    const logger = createLogger(options.verbose);
    const config = mergeWithEnv(await loadConfig(options.config)) as Record<string, unknown>;
    const rulesConfig = config?.rules as Record<string, unknown> | undefined;
    const ruleConfig = rulesConfig?.["cleanup-images"] as Record<string, unknown> | undefined;
    const appDefaultDir = options.projectRoot ? resolve(options.projectRoot) : process.cwd();

    const baseDir = options.searchDir
        ? resolve(options.searchDir)
        : resolveBaseDirectory(ruleConfig?.baseDirectory as string | undefined, appDefaultDir);

    const strategy = (options.strategy ?? ruleConfig?.strategy ?? "trash") as
        | "trash"
        | "move"
        | "hard-delete";
    const dryRun = !!options.dryRun;
    const yes = !!options.yes || !!options.force;

    logger.debug(`Base directory: ${baseDir}`);
    logger.debug(`Strategy: ${strategy}`);

    const deleteService = new DeleteService({
        baseDirectory: baseDir,
        options: { strategy },
    });

    try {
        console.log(formatInfo(`正在扫描 ${baseDir}...`));

        const { FileService } = await import("@cmtx/asset/file");
        const fileService = new FileService();
        const analysis = await fileService.analyzeDirectory(baseDir);

        const orphans = analysis.images.filter(
            (img): img is import("@cmtx/asset/file").LocalImageEntry =>
                img.type === "local" && img.orphan,
        );

        if (orphans.length === 0) {
            console.log(formatInfo("没有发现未引用的图片"));
            return;
        }

        const totalSize = orphans.reduce((s, o) => s + o.fileSize, 0);
        console.log(
            formatInfo(`发现 ${orphans.length} 张未引用图片，共 ${formatFileSize(totalSize)}`),
        );

        if (dryRun) {
            console.log(formatWarning("[DRY-RUN] 预览模式，不实际执行"));
            return;
        }

        if (!yes) {
            const confirmed = await promptConfirm(
                `将删除 ${orphans.length} 张未引用的图片，确定吗？`,
            );
            if (!confirmed) {
                console.log(formatInfo("已取消清理"));
                return;
            }
        }

        console.log(formatInfo("正在清理..."));
        const result = await deleteService.pruneDirectory(baseDir, { strategy });

        console.log("");
        if (result.deletedCount > 0) {
            console.log(
                formatSuccess(
                    `已删除: ${result.deletedCount}  释放: ${formatFileSize(result.freedSize)}`,
                ),
            );
        }
        if (result.failedCount > 0) {
            console.log(formatError(`失败: ${result.failedCount}`));
        }
        if (result.skippedCount > 0) {
            console.log(formatWarning(`跳过: ${result.skippedCount}`));
        }

        process.exit(result.failedCount > 0 ? 1 : 0);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(formatError(message));
        process.exit(1);
    }
}

const cleanupModule: CommandModule = {
    command,
    describe,
    builder,
    handler: (args) => handler(args as unknown as PruneCommandOptions),
};

export default cleanupModule;
