import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { DeleteService, resolveBaseDirectory } from "@cmtx/asset";
import type { Argv, CommandModule } from "yargs";
import type { DeleteCommandOptions } from "../../types/cli.js";
import { formatError, formatInfo, formatSuccess, formatWarning } from "../../utils/formatter.js";
import { createLogger } from "../../utils/logger.js";
import { loadConfig, mergeWithEnv } from "../../utils/config-loader.js";

export const command = "delete <imagePath..>";
export const describe = "安全删除指定图片（引用检查 + 支持批量）";

export function builder(yargs: Argv): Argv {
    return yargs
        .positional("imagePath", {
            description: "图片路径（支持多个）",
            type: "string",
            array: true,
            demandOption: true,
        })
        .option("strategy", {
            alias: "s",
            description: "删除策略",
            choices: ["trash", "move", "hard-delete"] as const,
        })
        .option("force", {
            alias: "f",
            description: "强制删除（跳过引用检查）",
            type: "boolean",
        })
        .option("remove-references", {
            alias: "r",
            description: "从引用的 Markdown 文件中移除图片标记",
            type: "boolean",
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

export async function handler(options: DeleteCommandOptions): Promise<void> {
    const logger = createLogger(options.verbose);
    const config = mergeWithEnv(await loadConfig(options.config)) as Record<string, unknown>;
    const rulesConfig = config?.rules as Record<string, unknown> | undefined;
    const ruleConfig = rulesConfig?.["delete-image"] as Record<string, unknown> | undefined;
    const appDefaultDir = options.projectRoot ? resolve(options.projectRoot) : process.cwd();
    const baseDir = resolveBaseDirectory(
        ruleConfig?.baseDirectory as string | undefined,
        appDefaultDir,
    );

    const deleteOptions = {
        strategy: (options.strategy ?? ruleConfig?.strategy ?? "trash") as
            | "trash"
            | "move"
            | "hard-delete",
        removeFromMarkdown:
            options.removeReferences ??
            (ruleConfig?.removeFromMarkdown as boolean | undefined) ??
            true,
        force: options.force ?? (ruleConfig?.force as boolean | undefined) ?? false,
        trashDir: options.moveDir,
    };

    const dryRun = !!options.dryRun;
    const yes = !!options.yes;

    logger.debug(`Base directory: ${baseDir}`);
    logger.debug(`Strategy: ${deleteOptions.strategy}`);

    const deleteService = new DeleteService({ baseDirectory: baseDir, options: deleteOptions });
    let successCount = 0;
    let failCount = 0;

    for (const rawPath of options.imagePath) {
        const imagePath = resolve(rawPath);

        if (!yes && !dryRun) {
            const confirmed = await promptConfirm(`确定要删除 ${imagePath} 吗？`);
            if (!confirmed) {
                console.log(formatInfo(`跳过 ${imagePath}`));
                continue;
            }
        }

        if (dryRun) {
            console.log(formatWarning(`[DRY-RUN] 将删除: ${imagePath}`));
            continue;
        }

        try {
            const result = await deleteService.safeDelete(imagePath, deleteOptions);
            if (result.success) {
                console.log(formatSuccess(`已删除: ${imagePath}`));
                if (
                    result.deleteResult?.referencesRemovedFrom &&
                    result.deleteResult.referencesRemovedFrom > 0
                ) {
                    console.log(
                        formatInfo(
                            `  从 ${result.deleteResult.referencesRemovedFrom} 个文件移除引用`,
                        ),
                    );
                }
                successCount++;
            } else if (!result.deleted) {
                console.log(
                    formatWarning(`跳过: ${imagePath}（图片被引用，使用 --force 强制删除）`),
                );
            } else {
                console.log(formatError(`删除失败: ${imagePath}`));
                failCount++;
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(formatError(`${imagePath}: ${message}`));
            failCount++;
        }
    }

    console.log("");
    if (failCount > 0) {
        console.log(formatError(`完成: ${successCount} 成功, ${failCount} 失败`));
        process.exit(1);
    } else if (successCount > 0) {
        console.log(formatSuccess(`全部删除成功 (${successCount} 个文件)`));
    } else {
        console.log(formatWarning("没有文件被删除"));
    }
}

const deleteModule: CommandModule = {
    command,
    describe,
    builder,
    handler: (args) => handler(args as unknown as DeleteCommandOptions),
};

export default deleteModule;
