/* eslint-disable no-console */
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { DeleteService } from "@cmtx/asset";
import type { DeleteCommandOptions } from "../../types/cli.js";
import { formatError, formatInfo, formatSuccess, formatWarning } from "../../utils/formatter.js";
import { createLogger } from "../../utils/logger.js";
import { loadConfig } from "../../utils/config-loader.js";
import type { Argv, CommandModule } from "yargs";

export const command = "delete <imagePath>";
export const describe = "安全删除图片（先检查引用再删除）";

export function builder(yargs: Argv): Argv {
    return yargs
        .positional("imagePath", {
            description: "图片路径",
            type: "string",
            demandOption: true,
        })
        .option("strategy", {
            alias: "s",
            description: "删除策略",
            choices: ["trash", "move", "hard-delete"] as const,
            default: "trash",
        })
        .option("force", {
            alias: "f",
            description: "强制删除（跳过引用检查）",
            type: "boolean",
            default: false,
        })
        .option("remove-references", {
            alias: "r",
            description: "从引用的 Markdown 文件中移除图片标记",
            type: "boolean",
            default: false,
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
            description: "自动确认，不进行交互提示",
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

async function resolveProjectRoot(argv: DeleteCommandOptions): Promise<string> {
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

export async function handler(argv: DeleteCommandOptions): Promise<void> {
    const logger = createLogger(argv.verbose);
    const workspaceRoot = await resolveProjectRoot(argv);
    const imagePath = resolve(argv.imagePath);
    const isDryRun = !!argv["dry-run"];
    const isYes = !!argv.yes;

    logger.debug(`Image path: ${imagePath}`);
    logger.debug(`Workspace root: ${workspaceRoot}`);
    logger.debug(`Strategy: ${argv.strategy ?? "trash"}`);
    logger.debug(`Force: ${!!argv.force}`);
    logger.debug(`Remove references: ${!!argv["remove-references"]}`);

    const deleteService = new DeleteService(
        {
            workspaceRoot,
            options: {
                strategy: argv.strategy ?? "trash",
                trashDir: argv["move-dir"],
                removeFromMarkdown: argv["remove-references"],
            },
        },
        logger,
    );

    try {
        // 1. 扫描引用
        console.log(formatInfo("正在扫描引用..."));
        const target = await deleteService.scanReferences(imagePath);

        const hasReferences = target.referencedIn.length > 0;

        // 2. 展示扫描结果
        if (hasReferences) {
            console.log("");
            console.log(formatWarning(`图片被 ${target.referencedIn.length} 个文件引用:`));
            for (const ref of target.referencedIn) {
                console.log(`  ${ref.relativePath} (${ref.count} 次)`);
            }
            console.log("");
        } else {
            console.log(formatInfo("图片未被任何 Markdown 文件引用"));
            console.log("");
        }

        // 3. 引用检查 + 交互确认
        if (hasReferences && !argv.force) {
            if (isDryRun) {
                console.log(
                    formatWarning("[DRY-RUN] 图片被引用，跳过删除（使用 --force 强制删除）"),
                );
                console.log("");
                return;
            }

            if (!isYes) {
                const confirmed = await promptConfirm("图片被引用，确定要删除吗？");
                if (!confirmed) {
                    console.log(formatInfo("已取消删除"));
                    return;
                }
            }
        }

        // 4. 执行安全删除
        if (isDryRun) {
            console.log(formatWarning("[DRY-RUN] 预览模式，不实际执行"));
            console.log(formatInfo(`将删除: ${imagePath}`));
            if (argv["remove-references"]) {
                console.log(formatInfo(`将移除 ${target.referencedIn.length} 个文件中的引用`));
            }
            console.log("");
            return;
        }

        console.log(formatInfo("正在执行删除..."));
        const result = await deleteService.safeDelete(imagePath, {
            strategy: argv.strategy ?? "trash",
            trashDir: argv["move-dir"],
            force: !!argv.force,
            removeFromMarkdown: argv["remove-references"],
        });

        // 5. 输出结果
        console.log("");
        if (result.success) {
            console.log(formatSuccess("删除成功"));
        } else if (!result.deleted) {
            console.log(formatWarning("文件删除已跳过（图片被引用，使用 --force 强制删除）"));
        } else {
            console.log(formatError("删除失败"));
        }

        if (result.deleteResult && result.deleteResult.referencesRemovedFrom > 0) {
            console.log(
                formatInfo(`已从 ${result.deleteResult.referencesRemovedFrom} 个文件中移除引用`),
            );
        }

        if (argv.verbose && result.detail.referencedIn.length > 0) {
            console.log("");
            console.log(formatInfo("引用详情:"));
            for (const ref of result.detail.referencedIn) {
                console.log(`  ${ref.relativePath} (${ref.count} 次)`);
            }
        }

        process.exit(result.success ? 0 : 1);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(formatError(message));
        process.exit(1);
    }
}

const deleteModule: CommandModule = {
    command,
    describe,
    builder,
    handler: (args) => handler(args as unknown as DeleteCommandOptions),
};

export default deleteModule;
