/* eslint-disable no-console */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { glob } from "tinyglobby";
import { stat } from "node:fs/promises";
import {
    createDefaultRuleEngine,
    createFileSystemService,
    createServiceRegistry,
    createCounterService,
} from "@cmtx/rule-engine";
import type { Argv, CommandModule } from "yargs";
import type { PublishCommandOptions } from "../types/cli.js";
import { formatError, formatInfo, formatSuccess } from "../utils/formatter.js";
import { createLogger } from "../utils/logger.js";

/**
 * 从 YAML 配置加载 rules 和 presets
 * 简单实现：只读取 presets 中的规则列表，不做完整 YAML 解析
 */
async function loadPresetSteps(
    presetName: string,
): Promise<Array<{ id: string; config?: Record<string, unknown> }>> {
    try {
        const content = await readFile(".cmtx/config.yaml", "utf-8");
        const lines = content.split("\n");
        const steps: Array<{ id: string; config?: Record<string, unknown> }> = [];
        let inPreset = false;
        let currentStep: { id: string; config?: Record<string, unknown> } | null = null;
        let stepConfig: Record<string, unknown> = {};

        for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.startsWith("presets:")) {
                inPreset = false;
                continue;
            }

            if (inPreset) {
                // Check if this is a new top-level preset
                if (trimmed.match(/^[a-zA-Z]/) && trimmed.endsWith(":")) {
                    if (trimmed.replace(":", "") === presetName) {
                        inPreset = true;
                    } else {
                        inPreset = false;
                    }
                    continue;
                }

                // Parse step entries within the preset
                if (trimmed.startsWith("- id:")) {
                    if (currentStep) {
                        if (Object.keys(stepConfig).length > 0) {
                            currentStep.config = stepConfig;
                            stepConfig = {};
                        }
                        steps.push(currentStep);
                    }
                    const stepId = trimmed.replace("- id:", "").trim();
                    currentStep = { id: stepId };
                } else if (trimmed.startsWith("config:") && currentStep) {
                    stepConfig = {};
                } else if (trimmed.startsWith("key:") && currentStep) {
                    stepConfig.key = trimmed.replace("key:", "").trim();
                } else if (trimmed.startsWith("pattern:") && currentStep) {
                    stepConfig.pattern = trimmed
                        .replace("pattern:", "")
                        .trim()
                        .replace(/^"(.*)"$/, "$1");
                } else if (trimmed.startsWith("required:") && currentStep) {
                    stepConfig.required =
                        trimmed.replace("required:", "").trim() === "false" ? false : true;
                } else if (line.startsWith("  ") && currentStep && trimmed.includes(":")) {
                    const colonIdx = trimmed.indexOf(":");
                    const key = trimmed.slice(0, colonIdx).trim();
                    const val = trimmed
                        .slice(colonIdx + 1)
                        .trim()
                        .replace(/^"(.*)"$/, "$1");
                    if (key && val) {
                        stepConfig[key] = val;
                    }
                }
                // Non-step, non-config lines - ignore
            }

            // Detect entering the publish preset
            if (trimmed.startsWith("presets:") || trimmed === "presets:") {
                inPreset = true;
            }
        }

        if (currentStep) {
            if (Object.keys(stepConfig).length > 0) {
                currentStep.config = stepConfig;
            }
            steps.push(currentStep);
        }

        return steps;
    } catch {
        // If no config file, return default publish preset steps
        return getDefaultPublishSteps();
    }
}

function getDefaultPublishSteps(): Array<{ id: string; config?: Record<string, unknown> }> {
    return [
        { id: "fm-validate", config: { key: "id", pattern: "^FB-[0-9]{6}$" } },
        { id: "fm-validate", config: { key: "slug", pattern: "^[a-z0-9-]+$", required: false } },
        { id: "frontmatter-id" },
        { id: "frontmatter-map" },
        { id: "directory-create" },
        { id: "file-copy" },
    ];
}

export const command = "publish <input>";
export const description = "执行 publish preset，将源文档发布为 prototype";

export function builder(yargs: Argv): Argv {
    return yargs
        .positional("input", {
            description: "Markdown 文件或目录路径，支持 glob 模式",
            type: "string",
        })
        .option("to-dir", {
            alias: "t",
            description: "目标目录",
            type: "string",
            demandOption: true,
        })
        .option("preset", {
            description: "preset 名称",
            type: "string",
            default: "publish",
        })
        .option("dry-run", {
            alias: "d",
            description: "预览模式，不写入文件",
            type: "boolean",
            default: false,
        })
        .option("verbose", {
            alias: "v",
            description: "显示详细处理状态",
            type: "boolean",
            default: false,
        })
        .option("force", {
            description: "覆盖已存在的目标目录",
            type: "boolean",
            default: false,
        });
}

export async function handler(options: PublishCommandOptions): Promise<void> {
    const log = createLogger(options.verbose ?? false, false);
    const inputPath = resolve(options.input);
    const toDir = options.toDir ?? "";
    const presetName = options.preset ?? "publish";
    const dryRun = options.dryRun ?? false;

    // Expand glob/files
    let files: string[] = [];
    try {
        const s = await stat(inputPath);
        if (s.isDirectory()) {
            files = await glob("**/*.md", {
                cwd: inputPath,
                ignore: ["node_modules/**", ".git/**"],
            });
            files = files.map((f) => resolve(inputPath, f));
        } else if (s.isFile()) {
            files = [inputPath];
        }
    } catch {
        // Try as glob pattern
        files = await glob(inputPath, { ignore: ["node_modules/**", ".git/**"] });
    }

    if (files.length === 0) {
        console.log(formatInfo(`No .md files found for input: ${options.input}`));
        return;
    }

    // Sort deterministically
    files.sort();

    log.info(`Found ${files.length} .md file(s)`);

    // Load preset steps
    const steps = await loadPresetSteps(presetName);
    log.info(`Loaded preset '${presetName}' with ${steps.length} step(s)`);

    // Setup services
    const registry = createServiceRegistry();
    registry.register(createFileSystemService());

    // Counter for private_id
    const counterService = createCounterService({ initialValue: 1 });
    registry.register(counterService);

    // Create rule engine
    const engine = createDefaultRuleEngine();

    const errors: Array<{ file: string; error: string }> = [];

    for (const filePath of files) {
        try {
            const content = await readFile(filePath, "utf-8");

            const context = {
                document: content,
                filePath,
                services: registry,
                dryRun,
                input: { "to-dir": toDir },
            };

            // Build preset config with steps
            const presetConfig = {
                id: presetName,
                name: presetName,
                steps: steps.map((s) => ({
                    id: s.id,
                    enabled: true,
                    config: s.config,
                })),
            };

            const result = await engine.executePreset(presetConfig, context);

            log.info(formatSuccess(`Processed: ${filePath}`));
            if (options.verbose && result.results.length > 0) {
                for (const r of result.results) {
                    if (r.result.messages && r.result.messages.length > 0) {
                        for (const msg of r.result.messages) {
                            log.info(`  [${r.ruleId}] ${msg}`);
                        }
                    }
                }
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push({ file: filePath, error: msg });
            console.error(formatError(`Failed: ${filePath} — ${msg}`));
        }
    }

    // Report summary
    const processed = files.length - errors.length;
    if (errors.length === 0) {
        console.log(formatSuccess(`Done: ${processed} file(s) processed successfully`));
    } else {
        console.error(
            formatError(`Done with errors: ${processed} succeeded, ${errors.length} failed`),
        );
        for (const e of errors) {
            console.error(formatError(`  ${e.file}: ${e.error}`));
        }
        process.exitCode = 1;
    }
}

const publishCmd: CommandModule<object, PublishCommandOptions> = {
    command,
    describe: description,
    builder: builder as (yargs: Argv<object>) => Argv<PublishCommandOptions>,
    handler,
};

export default publishCmd;
